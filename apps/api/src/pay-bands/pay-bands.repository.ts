import { Inject, Injectable } from '@nestjs/common';
import type { IsoDate } from '@paylens/domain';
import { type SQL, sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';

/** One band as stored, with the head counts of the people in it on the as-of date. */
export interface PayBandRow {
  readonly id: string;
  readonly countryCode: string;
  readonly levelCode: string;
  readonly currency: string;
  readonly minMinor: bigint;
  readonly midMinor: bigint;
  readonly maxMinor: bigint;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly employeeCount: number;
  readonly belowCount: number;
  readonly aboveCount: number;
}

@Injectable()
export class PayBandsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Bands in force on `asOf`, each with how many people sit in it, below it and above it.
   * A person counts when they have a salary record covering `asOf`, compared annualised
   * (monthly × 12) against the band. Level and country are the person's current ones: the
   * model keeps no history of transfers (data-model.md). Salary and band share the country's
   * currency, a rule planSalaryChange enforces on every write.
   */
  async list(filter: {
    readonly asOf: IsoDate;
    readonly country?: string;
    readonly level?: string;
  }): Promise<PayBandRow[]> {
    const conditions: SQL[] = [
      sql`b.effective_from <= ${filter.asOf}`,
      sql`(b.effective_to is null or b.effective_to > ${filter.asOf})`,
    ];
    if (filter.country !== undefined) {
      conditions.push(sql`b.country_code = ${filter.country}`);
    }
    if (filter.level !== undefined) {
      conditions.push(sql`l.code = ${filter.level}`);
    }

    const rows = await selectRows(
      this.db,
      sql`
        with bands as (
          select b.id, b.job_level_id, b.country_code, b.currency_code,
                 b.min_minor, b.mid_minor, b.max_minor, b.effective_from, b.effective_to,
                 l.code as level_code, l.track, l.rank
          from pay_bands b
          join job_levels l on l.id = b.job_level_id
          where ${sql.join(conditions, sql` and `)}
        ),
        pay_on_date as (
          select e.job_level_id, e.country_code,
                 s.amount_minor * (case s.pay_frequency when 'monthly' then 12 else 1 end)
                   as annual_local
          from employees e
          join salary_records s
            on s.employee_id = e.id
           and s.effective_from <= ${filter.asOf}
           and (s.effective_to is null or s.effective_to > ${filter.asOf})
        )
        select b.id::text, b.country_code, b.level_code, b.currency_code,
               b.min_minor::text, b.mid_minor::text, b.max_minor::text,
               b.effective_from::text, b.effective_to::text,
               count(p.annual_local)::int as employee_count,
               count(*) filter (where p.annual_local < b.min_minor)::int as below_count,
               count(*) filter (where p.annual_local > b.max_minor)::int as above_count
        from bands b
        left join pay_on_date p
          on p.job_level_id = b.job_level_id and p.country_code = b.country_code
        group by b.id, b.country_code, b.level_code, b.track, b.rank, b.currency_code,
                 b.min_minor, b.mid_minor, b.max_minor, b.effective_from, b.effective_to
        order by b.country_code, b.track, b.rank, b.level_code`,
    );

    return rows.map((row) => ({
      id: column.text(row, 'id'),
      countryCode: column.text(row, 'country_code'),
      levelCode: column.text(row, 'level_code'),
      currency: column.text(row, 'currency_code'),
      minMinor: column.bigint(row, 'min_minor'),
      midMinor: column.bigint(row, 'mid_minor'),
      maxMinor: column.bigint(row, 'max_minor'),
      effectiveFrom: column.text(row, 'effective_from'),
      effectiveTo: column.textOrNull(row, 'effective_to'),
      employeeCount: column.number(row, 'employee_count'),
      belowCount: column.number(row, 'below_count'),
      aboveCount: column.number(row, 'above_count'),
    }));
  }
}
