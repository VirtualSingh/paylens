import { sql } from 'drizzle-orm';
import type { Database } from '../database.js';
import {
  auditEvents,
  countries,
  currencies,
  departments,
  employees,
  fxRates,
  jobFamilies,
  jobLevels,
  payBands,
  salaryRecords,
  settings,
  users,
} from '../schema/index.js';
import type { GeneratedOrg } from './generate.js';

export class SeedRefusedError extends Error {
  constructor() {
    super(
      'The database already has employees; set SEED_FORCE=yes to replace them',
    );
    this.name = 'SeedRefusedError';
  }
}

export interface InsertOptions {
  /** Replace existing business data (never real users). */
  readonly force?: boolean;
  /** Rows per multi-row INSERT (seed.md: 1,000). */
  readonly batchSize?: number;
}

const DEMO_USERS = [
  {
    email: 'demo.hr@paylens.local',
    displayName: 'Demo HR manager',
    role: 'hr_manager',
  },
  {
    email: 'demo.viewer@paylens.local',
    displayName: 'Demo viewer',
    role: 'viewer',
  },
  {
    email: 'demo.admin@paylens.local',
    displayName: 'Demo admin',
    role: 'admin',
  },
] as const;

/**
 * Writes a generated organisation in one transaction: either all of it lands or none of it.
 * Refuses a database that already has employees unless forced (seed.md → safety).
 */
export async function insertOrg(
  db: Database,
  org: GeneratedOrg,
  { force = false, batchSize = 1_000 }: InsertOptions = {},
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx
      .select({ id: employees.id })
      .from(employees)
      .limit(1);
    if (existing.length > 0) {
      if (!force) throw new SeedRefusedError();
      await resetBusinessData(tx);
    }

    await tx.insert(currencies).values([...org.currencies]);
    await tx.insert(countries).values([...org.countries]);
    const departmentIds = idsByCode(
      await tx
        .insert(departments)
        .values([...org.departments])
        .returning(),
    );
    const familyIds = idsByCode(
      await tx
        .insert(jobFamilies)
        .values([...org.jobFamilies])
        .returning(),
    );
    const levelIds = idsByCode(
      await tx
        .insert(jobLevels)
        .values([...org.jobLevels])
        .returning(),
    );
    await tx
      .insert(fxRates)
      .values(
        org.fxRates.map((r) => ({
          quoteCurrency: r.quote,
          rate: r.rate,
          asOf: r.asOf,
          source: 'sample',
        })),
      );
    await tx.insert(payBands).values(
      org.payBands.map((b) => ({
        jobLevelId: lookup(levelIds, b.levelCode),
        countryCode: b.countryCode,
        currencyCode: b.currency,
        minMinor: b.minMinor,
        midMinor: b.midMinor,
        maxMinor: b.maxMinor,
        effectiveFrom: b.effectiveFrom,
        effectiveTo: b.effectiveTo,
      })),
    );

    // People first; managers may sit in a later batch, so they are linked afterwards.
    for (const batch of chunks(org.employees, batchSize)) {
      await tx.insert(employees).values(
        batch.map((e) => ({
          id: e.id,
          employeeCode: e.employeeCode,
          firstName: e.firstName,
          lastName: e.lastName,
          workEmail: e.workEmail,
          countryCode: e.countryCode,
          departmentId: lookup(departmentIds, e.departmentCode),
          jobFamilyId: lookup(familyIds, e.jobFamilyCode),
          jobLevelId: lookup(levelIds, e.levelCode),
          jobTitle: e.jobTitle,
          employmentType: e.employmentType,
          fte: e.fte,
          hireDate: e.hireDate,
          terminationDate: e.terminationDate,
          status: e.status,
          gender: e.gender,
        })),
      );
    }
    const managed = org.employees.filter((e) => e.managerId !== null);
    for (const batch of chunks(managed, batchSize)) {
      const pairs = batch.map(
        (e) => sql`(${e.id}::uuid, ${e.managerId}::uuid)`,
      );
      await tx.execute(sql`
        update employees set manager_id = links.manager_id
        from (values ${sql.join(pairs, sql`, `)}) as links(id, manager_id)
        where employees.id = links.id`);
    }

    for (const batch of chunks(org.salaryRecords, batchSize)) {
      await tx.insert(salaryRecords).values(
        batch.map((r) => ({
          id: r.id,
          employeeId: r.employeeId,
          amountMinor: r.amountMinor,
          currencyCode: r.currency,
          payFrequency: r.frequency,
          effectiveFrom: r.effectiveFrom,
          effectiveTo: r.effectiveTo,
          reason: r.reason,
          note: r.note,
        })),
      );
    }

    await tx
      .insert(users)
      .values([...DEMO_USERS].map((u) => ({ ...u, isDemo: true })));
    // The audit log starts with one event per person, so "who changed what" has history.
    for (const batch of chunks(org.employees, batchSize)) {
      await tx.insert(auditEvents).values(
        batch.map((e) => ({
          action: 'employee.imported',
          entityType: 'employee',
          entityId: e.id,
          after: { employeeCode: e.employeeCode, source: 'seed' },
        })),
      );
    }
    await tx
      .insert(settings)
      .values({ key: 'reporting_currency', value: 'USD' });
  });
}

/**
 * Empties the business tables and the demo users; real users stay. audit_events refuses
 * TRUNCATE by trigger, so the guard is switched off only inside this transaction.
 */
async function resetBusinessData(tx: Database): Promise<void> {
  await tx.execute(
    sql`alter table audit_events disable trigger audit_events_no_truncate`,
  );
  await tx.execute(sql`
    truncate audit_events, salary_records, pay_bands, employees, fx_rates, job_levels,
             job_families, departments, countries, currencies, settings restart identity`);
  await tx.execute(
    sql`alter table audit_events enable trigger audit_events_no_truncate`,
  );
  await tx.execute(sql`delete from users where is_demo`);
}

function idsByCode(
  rows: readonly { id: number; code: string }[],
): Map<string, number> {
  return new Map(rows.map((row) => [row.code, row.id]));
}

function lookup(ids: Map<string, number>, code: string): number {
  const id = ids.get(code);
  if (id === undefined) throw new Error(`Unknown reference code ${code}`);
  return id;
}

function* chunks<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let start = 0; start < items.length; start += size) {
    yield items.slice(start, start + size);
  }
}
