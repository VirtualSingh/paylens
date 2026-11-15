import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SalaryRecordJson } from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { selectRows } from '../db/select-rows.js';
import { type SalaryRecordRow, SalaryRepository } from './salary.repository.js';

@Injectable()
export class SalariesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly salaries: SalaryRepository,
  ) {}

  /** The effective-dated history of one person, newest first; 404 if there is no such person. */
  async history(employeeId: string): Promise<SalaryRecordJson[]> {
    const exists = await selectRows(
      this.db,
      sql`select 1 from employees where id = ${employeeId}`,
    );
    if (exists.length === 0) {
      throw new NotFoundException('There is no employee with this id');
    }
    return (await this.salaries.history(employeeId)).map(toSalaryRecordJson);
  }
}

export function toSalaryRecordJson(row: SalaryRecordRow): SalaryRecordJson {
  return {
    id: row.id,
    salary: { amountMinor: row.amountMinor.toString(), currency: row.currency },
    frequency: row.frequency,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    reason: row.reason,
    note: row.note,
    createdAt: row.createdAt,
  };
}
