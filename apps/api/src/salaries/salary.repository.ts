import { Inject, Injectable } from '@nestjs/common';
import type { SalaryChangePlan } from '@paylens/domain';
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

  /**
   * Executes a plan from libs/domain inside the caller's transaction: closing records is the
   * only update history ever gets; the new record is an insert. The exclusion constraint in
   * the database still guards against any overlap.
   */
  async applyPlan(
    tx: Database,
    employeeId: string,
    plan: SalaryChangePlan,
    createdBy: string | null,
  ): Promise<SalaryRecordRow> {
    for (const closing of plan.close) {
      await tx.execute(
        sql`update salary_records set effective_to = ${closing.effectiveTo}
            where id = ${closing.recordId} and employee_id = ${employeeId}`,
      );
    }
    const { insert } = plan;
    const rows = await selectRows(
      tx,
      sql`insert into salary_records (employee_id, amount_minor, currency_code, pay_frequency,
                                       effective_from, effective_to, reason, note, created_by)
          values (${employeeId}, ${insert.amount.amountMinor.toString()}::bigint,
                  ${insert.amount.currency}, ${insert.frequency}::pay_frequency,
                  ${insert.effectiveFrom}, ${insert.effectiveTo},
                  ${insert.reason}::salary_reason, ${insert.note}, ${createdBy})
          returning id::text, amount_minor::text, currency_code, pay_frequency::text,
                    effective_from::text, effective_to::text, reason::text, note,
                    to_json(created_at) #>> '{}' as created_at`,
    );
    const row = rows[0];
    if (row === undefined) {
      throw new Error('The new salary record was not returned');
    }
    return toSalaryRecordRow(row);
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
