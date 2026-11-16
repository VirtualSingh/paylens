import { Inject, Injectable } from '@nestjs/common';
import type { IsoDate } from '@paylens/domain';
import { PAY_FREQUENCIES, type PayFrequencyName } from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';

/** One active person on a date: their salary then, and their band then (local currency). */
export interface CompRow {
  /** What a breakdown can group by: code and the label people read. */
  readonly country: { readonly key: string; readonly label: string };
  readonly department: { readonly key: string; readonly label: string };
  /** Levels sort by the ladder (track, then rank), not by name. */
  readonly level: {
    readonly key: string;
    readonly label: string;
    readonly order: number;
  };
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

/**
 * The read model every analytics question starts from (analytics.md): one row per active
 * person on `asOf`, with the salary record and the band valid that day. The arithmetic (FX,
 * bands, percentiles) happens in libs/domain, exactly, so the dashboard and the profile can
 * never disagree on a number.
 */
@Injectable()
export class AnalyticsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async compOn(asOf: IsoDate): Promise<CompRow[]> {
    const rows = await selectRows(
      this.db,
      sql`select e.country_code, c.name as country_name, d.code as department_code,
                 d.name as department_name, l.code as level_code,
                 (case l.track when 'ic' then 0 else 100 end + l.rank)::int as level_order,
                 s.amount_minor::text, s.currency_code, s.pay_frequency::text,
                 b.min_minor::text, b.mid_minor::text, b.max_minor::text,
                 b.currency_code as band_currency
          from employees e
          join countries c on c.code = e.country_code
          join departments d on d.id = e.department_id
          join job_levels l on l.id = e.job_level_id
          left join salary_records s
            on s.employee_id = e.id
           and s.effective_from <= ${asOf}
           and (s.effective_to is null or s.effective_to > ${asOf})
          left join pay_bands b
            on b.job_level_id = e.job_level_id
           and b.country_code = e.country_code
           and b.effective_from <= ${asOf}
           and (b.effective_to is null or b.effective_to > ${asOf})
          -- Active as analytics.md defines it; status is today's (no status history kept).
          where e.status = 'active'
            and e.hire_date <= ${asOf}
            and (e.termination_date is null or e.termination_date > ${asOf})`,
    );
    return rows.map((row) => {
      const amount = column.textOrNull(row, 'amount_minor');
      const min = column.textOrNull(row, 'min_minor');
      return {
        country: {
          key: column.text(row, 'country_code'),
          label: column.text(row, 'country_name'),
        },
        department: {
          key: column.text(row, 'department_code'),
          label: column.text(row, 'department_name'),
        },
        level: {
          key: column.text(row, 'level_code'),
          label: column.text(row, 'level_code'),
          order: column.number(row, 'level_order'),
        },
        salary:
          amount === null
            ? null
            : {
                amountMinor: BigInt(amount),
                currency: column.text(row, 'currency_code'),
                frequency: column.oneOf(row, 'pay_frequency', PAY_FREQUENCIES),
              },
        band:
          min === null
            ? null
            : {
                minMinor: BigInt(min),
                midMinor: column.bigint(row, 'mid_minor'),
                maxMinor: column.bigint(row, 'max_minor'),
                currency: column.text(row, 'band_currency'),
              },
      };
    });
  }
}
