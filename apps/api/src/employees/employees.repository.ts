import { Inject, Injectable } from '@nestjs/common';
import type { EmploymentFacts, StatusChangePlan } from '@paylens/domain';
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TYPES,
  type EmploymentType,
  type Gender,
  GENDERS,
  type EmployeeDirectoryQuery,
  type EmployeeSortField,
  type EmployeeStatus,
  PAY_FREQUENCIES,
  type PayFrequencyName,
  type UpdateEmployeeRequest,
} from '@paylens/shared';
import { type SQL, sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, type Row, selectRows } from '../db/select-rows.js';

/** One directory row as stored: money stays in local currency; the service converts it. */
export interface DirectoryRow {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly workEmail: string;
  readonly countryCode: string;
  readonly departmentCode: string;
  readonly departmentName: string;
  readonly levelCode: string;
  readonly jobTitle: string;
  readonly status: EmployeeStatus;
  readonly hireDate: string;
  readonly salary: {
    readonly amountMinor: bigint;
    readonly currency: string;
    readonly frequency: PayFrequencyName;
  } | null;
  readonly band: {
    readonly minMinor: bigint;
    readonly midMinor: bigint;
    readonly maxMinor: bigint;
    readonly currency: string;
  } | null;
}

/** Sort fields map to fixed SQL; nothing the client sends is ever spliced into the query. */
const SORT_EXPRESSIONS: Readonly<Record<EmployeeSortField, readonly SQL[]>> = {
  lastName: [sql`lower(last_name)`, sql`lower(first_name)`],
  hireDate: [sql`hire_date`],
  country: [sql`country_code`],
  department: [sql`department_name`],
  level: [sql`level_rank`, sql`level_code`],
  annualReporting: [sql`annual_reporting`],
  compaRatio: [sql`compa_ratio`],
};

@Injectable()
export class EmployeesRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /** The directory: filters, sort and one page, plus the number of matches (api.md). */
  async search(
    query: EmployeeDirectoryQuery,
  ): Promise<{ rows: DirectoryRow[]; total: number }> {
    const directory = directoryCte(query.reportingCurrency);
    const where = whereClause(query);

    const [countRows, pageRows] = await Promise.all([
      selectRows(
        this.db,
        sql`${directory} select count(*)::int as total from ranked ${where}`,
      ),
      selectRows(
        this.db,
        sql`${directory}
          select ${DIRECTORY_COLUMNS}
          from ranked
          ${where}
          ${orderBy(query.sort)}
          limit ${query.pageSize} offset ${(query.page - 1) * query.pageSize}`,
      ),
    ]);

    return {
      total: column.number(countRows[0] ?? { total: 0 }, 'total'),
      rows: pageRows.map(toDirectoryRow),
    };
  }

  /**
   * Locks one person for a change (SELECT … FOR UPDATE inside the caller's transaction), so
   * two changes to the same person run one after the other. Returns the version the change
   * must match and the currency salaries are paid in there.
   */
  async lockForChange(
    tx: Database,
    id: string,
  ): Promise<{ version: number; currencyCode: string } | null> {
    const rows = await selectRows(
      tx,
      sql`select e.version, c.currency_code
          from employees e join countries c on c.code = e.country_code
          where e.id = ${id}
          for update of e`,
    );
    const row = rows[0];
    return row === undefined
      ? null
      : {
          version: column.number(row, 'version'),
          currencyCode: column.text(row, 'currency_code'),
        };
  }

  /** Records that the person changed; the new version is the next ETag. */
  async bumpVersion(tx: Database, id: string): Promise<number> {
    const rows = await selectRows(
      tx,
      sql`update employees set version = version + 1, updated_at = now()
          where id = ${id} returning version`,
    );
    return column.number(rows[0] ?? { version: Number.NaN }, 'version');
  }

  /** Whether there is a person with this id (for 404s on their sub-resources). */
  async exists(id: string): Promise<boolean> {
    const rows = await selectRows(
      this.db,
      sql`select 1 from employees where id = ${id}`,
    );
    return rows.length > 0;
  }

  /** One person with the same current pay as the directory, plus profile details. */
  async findById(id: string): Promise<ProfileRow | null> {
    const rows = await selectRows(
      this.db,
      sql`${directoryCte('USD')}
        select ${DIRECTORY_COLUMNS}, job_family_code, job_family_name,
               employment_type::text, fte::text, termination_date::text, gender::text,
               version, manager_id::text, manager_code, manager_name
        from ranked
        where id = ${id}`,
    );
    const row = rows[0];
    return row === undefined ? null : toProfileRow(row);
  }

  /**
   * Looks up what the codes in a create or edit request point at, in one round trip. Each
   * field is null when nothing matches (or nothing was asked); the service reports which.
   */
  async resolveReferences(
    tx: Database,
    codes: {
      readonly countryCode?: string;
      readonly departmentCode?: string;
      readonly jobFamilyCode?: string;
      readonly levelCode?: string;
      readonly managerId?: string | null;
    },
  ): Promise<ResolvedReferences> {
    const rows = await selectRows(
      tx,
      sql`select
            (select currency_code from countries where code = ${codes.countryCode ?? null})
              as currency_code,
            (select id from departments where code = ${codes.departmentCode ?? null})
              as department_id,
            (select id from job_families where code = ${codes.jobFamilyCode ?? null})
              as job_family_id,
            (select id from job_levels where code = ${codes.levelCode ?? null})
              as job_level_id,
            (select status::text from employees where id = ${codes.managerId ?? null}::uuid)
              as manager_status`,
    );
    const row = rows[0] ?? {};
    const managerStatus = column.textOrNull(row, 'manager_status');
    return {
      currencyCode: column.textOrNull(row, 'currency_code'),
      departmentId: column.numberOrNull(row, 'department_id'),
      jobFamilyId: column.numberOrNull(row, 'job_family_id'),
      jobLevelId: column.numberOrNull(row, 'job_level_id'),
      managerStatus:
        managerStatus === null
          ? null
          : column.oneOf(row, 'manager_status', EMPLOYEE_STATUSES),
    };
  }

  /**
   * The highest employee code, read under a transaction-scoped advisory lock: two people
   * created at the same moment queue here instead of both picking the same next code. The
   * lock is released when the transaction commits or rolls back.
   */
  async highestCodeLocked(tx: Database): Promise<string | null> {
    await tx.execute(sql`select pg_advisory_xact_lock(${EMPLOYEE_CODE_LOCK})`);
    const rows = await selectRows(
      tx,
      sql`select max(employee_code) as highest from employees`,
    );
    return column.textOrNull(rows[0] ?? { highest: null }, 'highest');
  }

  /** The fields HR may edit, as the edit request names them (codes, not ids). */
  async editableFields(
    tx: Database,
    id: string,
  ): Promise<EmployeeDetails | null> {
    const rows = await selectRows(
      tx,
      sql`select e.first_name, e.last_name, e.work_email::text, d.code as department_code,
                 f.code as job_family_code, l.code as level_code, e.job_title,
                 e.manager_id::text, e.employment_type::text,
                 trim_scale(e.fte)::text as fte, e.gender::text
          from employees e
          join departments d on d.id = e.department_id
          join job_families f on f.id = e.job_family_id
          join job_levels l on l.id = e.job_level_id
          where e.id = ${id}`,
    );
    const row = rows[0];
    return row === undefined
      ? null
      : {
          firstName: column.text(row, 'first_name'),
          lastName: column.text(row, 'last_name'),
          workEmail: column.text(row, 'work_email'),
          departmentCode: column.text(row, 'department_code'),
          jobFamilyCode: column.text(row, 'job_family_code'),
          levelCode: column.text(row, 'level_code'),
          jobTitle: column.text(row, 'job_title'),
          managerId: column.textOrNull(row, 'manager_id'),
          employmentType: column.oneOf(
            row,
            'employment_type',
            EMPLOYMENT_TYPES,
          ),
          fte: column.text(row, 'fte'),
          gender: column.oneOf(row, 'gender', GENDERS),
        };
  }

  /**
   * The manager's id, then their manager's, up to the top of the org. The depth limit keeps a
   * loop already in the data (which this rule exists to prevent) from running forever.
   */
  async managerLine(tx: Database, managerId: string): Promise<string[]> {
    const rows = await selectRows(
      tx,
      sql`with recursive line as (
            select id, manager_id, 1 as depth from employees where id = ${managerId}
            union all
            select e.id, e.manager_id, line.depth + 1
            from employees e join line on e.id = line.manager_id
            where line.depth < 100
          )
          select id::text from line order by depth`,
    );
    return rows.map((row) => column.text(row, 'id'));
  }

  /**
   * Writes the changed fields and bumps the version, returning the new one. Column names are
   * fixed here; codes become ids inside the statement (the service has checked they exist).
   */
  async update(
    tx: Database,
    id: string,
    changes: Partial<EmployeeDetails>,
  ): Promise<number> {
    const sets: SQL[] = [];
    if (changes.firstName !== undefined) {
      sets.push(sql`first_name = ${changes.firstName}`);
    }
    if (changes.lastName !== undefined) {
      sets.push(sql`last_name = ${changes.lastName}`);
    }
    if (changes.workEmail !== undefined) {
      sets.push(sql`work_email = ${changes.workEmail}`);
    }
    if (changes.departmentCode !== undefined) {
      sets.push(
        sql`department_id = (select id from departments where code = ${changes.departmentCode})`,
      );
    }
    if (changes.jobFamilyCode !== undefined) {
      sets.push(
        sql`job_family_id = (select id from job_families where code = ${changes.jobFamilyCode})`,
      );
    }
    if (changes.levelCode !== undefined) {
      sets.push(
        sql`job_level_id = (select id from job_levels where code = ${changes.levelCode})`,
      );
    }
    if (changes.jobTitle !== undefined) {
      sets.push(sql`job_title = ${changes.jobTitle}`);
    }
    if (changes.managerId !== undefined) {
      sets.push(sql`manager_id = ${changes.managerId}::uuid`);
    }
    if (changes.employmentType !== undefined) {
      sets.push(
        sql`employment_type = ${changes.employmentType}::employment_type`,
      );
    }
    if (changes.fte !== undefined) {
      sets.push(sql`fte = ${changes.fte}::numeric`);
    }
    if (changes.gender !== undefined) {
      sets.push(sql`gender = ${changes.gender}::gender`);
    }
    sets.push(sql`version = version + 1`, sql`updated_at = now()`);

    const rows = await selectRows(
      tx,
      sql`update employees set ${sql.join(sets, sql`, `)}
          where id = ${id} returning version`,
    );
    return column.number(rows[0] ?? { version: Number.NaN }, 'version');
  }

  /** What the status rules need: status, hire date and the salary record still open. */
  async employmentFacts(
    tx: Database,
    id: string,
  ): Promise<(EmploymentFacts & { terminationDate: string | null }) | null> {
    const rows = await selectRows(
      tx,
      sql`select e.status::text, e.hire_date::text, e.termination_date::text,
                 s.id::text as open_salary_id, s.effective_from::text as open_salary_from
          from employees e
          left join salary_records s on s.employee_id = e.id and s.effective_to is null
          where e.id = ${id}`,
    );
    const row = rows[0];
    if (row === undefined) {
      return null;
    }
    const openSalaryId = column.textOrNull(row, 'open_salary_id');
    return {
      status: column.oneOf(row, 'status', EMPLOYEE_STATUSES),
      hireDate: column.text(row, 'hire_date'),
      terminationDate: column.textOrNull(row, 'termination_date'),
      openSalary:
        openSalaryId === null
          ? null
          : {
              id: openSalaryId,
              effectiveFrom: column.text(row, 'open_salary_from'),
            },
    };
  }

  /** Writes a status (and termination date) and bumps the version, returning the new one. */
  async setStatus(
    tx: Database,
    id: string,
    plan: Pick<StatusChangePlan, 'status' | 'terminationDate'>,
  ): Promise<number> {
    const rows = await selectRows(
      tx,
      sql`update employees
          set status = ${plan.status}::employee_status,
              termination_date = ${plan.terminationDate}::date,
              version = version + 1, updated_at = now()
          where id = ${id} returning version`,
    );
    return column.number(rows[0] ?? { version: Number.NaN }, 'version');
  }

  /** Adds a person (status active, version 1) and returns their id. */
  async insert(tx: Database, person: NewEmployee): Promise<string> {
    const rows = await selectRows(
      tx,
      sql`insert into employees (employee_code, first_name, last_name, work_email,
                                 country_code, department_id, job_family_id, job_level_id,
                                 job_title, manager_id, employment_type, fte, hire_date,
                                 status, gender)
          values (${person.employeeCode}, ${person.firstName}, ${person.lastName},
                  ${person.workEmail}, ${person.countryCode}, ${person.departmentId},
                  ${person.jobFamilyId}, ${person.jobLevelId}, ${person.jobTitle},
                  ${person.managerId}::uuid, ${person.employmentType}::employment_type,
                  ${person.fte}::numeric, ${person.hireDate}::date, 'active',
                  ${person.gender}::gender)
          returning id::text`,
    );
    return column.text(rows[0] ?? {}, 'id');
  }
}

/** Any constant unique within this app; only employee code allocation takes this lock. */
const EMPLOYEE_CODE_LOCK = 7_301;

/** What a request's codes point at; null where nothing matches. */
export interface ResolvedReferences {
  readonly currencyCode: string | null;
  readonly departmentId: number | null;
  readonly jobFamilyId: number | null;
  readonly jobLevelId: number | null;
  /** The manager's status; null when there is no such person. */
  readonly managerStatus: EmployeeStatus | null;
}

/** Everything an edit may change, as the edit request names it. */
export type EmployeeDetails = Required<UpdateEmployeeRequest>;

/** A new person, with codes already resolved to ids. */
export interface NewEmployee {
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly workEmail: string;
  readonly countryCode: string;
  readonly departmentId: number;
  readonly jobFamilyId: number;
  readonly jobLevelId: number;
  readonly jobTitle: string;
  readonly managerId: string | null;
  readonly employmentType: EmploymentType;
  readonly fte: string;
  readonly hireDate: string;
  readonly gender: Gender;
}

/** A profile row: the directory row plus the details only the profile shows. */
export interface ProfileRow extends DirectoryRow {
  readonly jobFamilyCode: string;
  readonly jobFamilyName: string;
  readonly employmentType: EmploymentType;
  readonly fte: string;
  readonly terminationDate: string | null;
  readonly gender: Gender;
  readonly version: number;
  readonly manager: {
    readonly id: string;
    readonly employeeCode: string;
    readonly name: string;
  } | null;
}

const DIRECTORY_COLUMNS = sql`
  id::text, employee_code, first_name, last_name, work_email, country_code,
  department_code, department_name, level_code, job_title, status::text,
  hire_date::text, amount_minor::text, currency_code, pay_frequency::text,
  min_minor::text, mid_minor::text, max_minor::text, band_currency`;

/**
 * Everyone with today's salary and band, plus three derived columns used only for filtering
 * and sorting. Displayed figures are computed in libs/domain (exact, half-even rounding).
 */
function directoryCte(reportingCurrency: string): SQL {
  return sql`
    with latest_fx as (
      -- the latest USD-based rate per currency on or before today
      select distinct on (quote_currency) quote_currency, rate
      from fx_rates
      where as_of <= current_date
      order by quote_currency, as_of desc
    ),
    people as (
      select e.id, e.employee_code, e.first_name, e.last_name, e.work_email, e.country_code,
             d.code as department_code, d.name as department_name,
             l.code as level_code, l.rank as level_rank,
             e.job_title, e.status, e.hire_date, e.manager_id,
             f.code as job_family_code, f.name as job_family_name,
             e.employment_type, e.fte, e.termination_date, e.gender, e.version,
             m.employee_code as manager_code, m.first_name || ' ' || m.last_name as manager_name,
             s.amount_minor, s.currency_code, s.pay_frequency,
             s.amount_minor * (case s.pay_frequency when 'monthly' then 12 else 1 end) as annual_local,
             b.min_minor, b.mid_minor, b.max_minor, b.currency_code as band_currency
      from employees e
      join departments d on d.id = e.department_id
      join job_families f on f.id = e.job_family_id
      join job_levels l on l.id = e.job_level_id
      left join employees m on m.id = e.manager_id
      left join current_salaries s on s.employee_id = e.id
      left join pay_bands b
        on b.job_level_id = e.job_level_id
       and b.country_code = e.country_code
       and b.effective_from <= current_date
       and (b.effective_to is null or b.effective_to > current_date)
    ),
    ranked as (
      select p.*,
             p.annual_local::numeric
               * (case when ${reportingCurrency} = 'USD' then 1 else reporting_fx.rate end)
               / (case when p.currency_code = 'USD' then 1 else local_fx.rate end)
               as annual_reporting,
             p.annual_local::numeric / p.mid_minor as compa_ratio,
             case
               when p.annual_local is null or p.min_minor is null then null
               when p.annual_local < p.min_minor then 'below'
               when p.annual_local > p.max_minor then 'above'
               else 'within'
             end as band_position
      from people p
      left join latest_fx local_fx on local_fx.quote_currency = p.currency_code
      left join latest_fx reporting_fx on reporting_fx.quote_currency = ${reportingCurrency}
    )`;
}

function whereClause(query: EmployeeDirectoryQuery): SQL {
  const conditions: SQL[] = [];
  if (query.q !== undefined) {
    const pattern = `%${escapeLikePattern(query.q)}%`;
    conditions.push(
      sql`(first_name || ' ' || last_name || ' ' || employee_code ilike ${pattern}
           or work_email ilike ${pattern})`,
    );
  }
  const anyOf = (columnName: SQL, values: readonly string[]) => {
    if (values.length > 0) {
      conditions.push(
        sql`${columnName} in (${sql.join(
          values.map((value) => sql`${value}`),
          sql`, `,
        )})`,
      );
    }
  };
  anyOf(sql`country_code`, query.country);
  anyOf(sql`department_code`, query.department);
  anyOf(sql`level_code`, query.level);
  anyOf(sql`status::text`, query.status);
  anyOf(sql`band_position`, query.bandPosition);
  if (query.managerId !== undefined) {
    conditions.push(sql`manager_id = ${query.managerId}`);
  }
  return conditions.length === 0
    ? sql``
    : sql`where ${sql.join(conditions, sql` and `)}`;
}

function orderBy(sort: EmployeeDirectoryQuery['sort']): SQL {
  const terms = sort.flatMap(({ field, direction }) =>
    SORT_EXPRESSIONS[field].map(
      (expression) =>
        sql`${expression} ${direction === 'desc' ? sql`desc` : sql`asc`} nulls last`,
    ),
  );
  // employee_code makes the order total, so pages never repeat or skip a row.
  return sql`order by ${sql.join([...terms, sql`employee_code asc`], sql`, `)}`;
}

/** In LIKE patterns `%` and `_` are wildcards; a search for them means the characters. */
function escapeLikePattern(text: string): string {
  return text.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function toDirectoryRow(row: Row): DirectoryRow {
  const amount = column.textOrNull(row, 'amount_minor');
  const bandMin = column.textOrNull(row, 'min_minor');
  return {
    id: column.text(row, 'id'),
    employeeCode: column.text(row, 'employee_code'),
    firstName: column.text(row, 'first_name'),
    lastName: column.text(row, 'last_name'),
    workEmail: column.text(row, 'work_email'),
    countryCode: column.text(row, 'country_code'),
    departmentCode: column.text(row, 'department_code'),
    departmentName: column.text(row, 'department_name'),
    levelCode: column.text(row, 'level_code'),
    jobTitle: column.text(row, 'job_title'),
    status: column.oneOf(row, 'status', EMPLOYEE_STATUSES),
    hireDate: column.text(row, 'hire_date'),
    salary:
      amount === null
        ? null
        : {
            amountMinor: BigInt(amount),
            currency: column.text(row, 'currency_code'),
            frequency: column.oneOf(row, 'pay_frequency', PAY_FREQUENCIES),
          },
    band:
      bandMin === null
        ? null
        : {
            minMinor: BigInt(bandMin),
            midMinor: column.bigint(row, 'mid_minor'),
            maxMinor: column.bigint(row, 'max_minor'),
            currency: column.text(row, 'band_currency'),
          },
  };
}

function toProfileRow(row: Row): ProfileRow {
  const managerId = column.textOrNull(row, 'manager_id');
  return {
    ...toDirectoryRow(row),
    jobFamilyCode: column.text(row, 'job_family_code'),
    jobFamilyName: column.text(row, 'job_family_name'),
    employmentType: column.oneOf(row, 'employment_type', EMPLOYMENT_TYPES),
    fte: column.text(row, 'fte'),
    terminationDate: column.textOrNull(row, 'termination_date'),
    gender: column.oneOf(row, 'gender', GENDERS),
    version: column.number(row, 'version'),
    manager:
      managerId === null
        ? null
        : {
            id: managerId,
            employeeCode: column.text(row, 'manager_code'),
            name: column.text(row, 'manager_name'),
          },
  };
}
