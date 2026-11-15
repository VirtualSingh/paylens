import { Inject, Injectable } from '@nestjs/common';
import {
  PAY_FREQUENCIES,
  type PayFrequencyName,
  SALARY_REASONS,
  type SalaryReasonName,
} from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, type Row, selectRows } from '../db/select-rows.js';

/** One stored salary record (money still in minor units). */
export interface SalaryRecordRow {
  readonly id: string;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly frequency: PayFrequencyName;
  readonly effectiveFrom: string;
  readonly effectiveTo: string | null;
  readonly reason: SalaryReasonName;
  readonly note: string | null;
  readonly createdAt: string;
}

@Injectable()
export class SalaryRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * An employee's whole history, newest first. On the same start date a correction sorts
   * before the record it superseded (newer created_at first). `db` may be a transaction.
   */
  async history(
    employeeId: string,
    db: Database = this.db,
  ): Promise<SalaryRecordRow[]> {
    const rows = await selectRows(
      db,
      sql`select id::text, amount_minor::text, currency_code, pay_frequency::text,
                 effective_from::text, effective_to::text, reason::text, note,
                 to_json(created_at) #>> '{}' as created_at
          from salary_records
          where employee_id = ${employeeId}
          order by effective_from desc, created_at desc`,
    );
    return rows.map(toSalaryRecordRow);
  }
}

export function toSalaryRecordRow(row: Row): SalaryRecordRow {
  return {
    id: column.text(row, 'id'),
    amountMinor: column.bigint(row, 'amount_minor'),
    currency: column.text(row, 'currency_code'),
    frequency: column.oneOf(row, 'pay_frequency', PAY_FREQUENCIES),
    effectiveFrom: column.text(row, 'effective_from'),
    effectiveTo: column.textOrNull(row, 'effective_to'),
    reason: column.oneOf(row, 'reason', SALARY_REASONS),
    note: column.textOrNull(row, 'note'),
    createdAt: column.text(row, 'created_at'),
  };
}
