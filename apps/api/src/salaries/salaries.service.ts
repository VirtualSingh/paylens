import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Money, planSalaryChange, type SalaryRecord } from '@paylens/domain';
import type {
  SalaryChangeRequest,
  SalaryChangeResult,
  SalaryRecordJson,
} from '@paylens/shared';
import { sql } from 'drizzle-orm';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import { type Database, DATABASE } from '../db/database.js';
import { selectRows } from '../db/select-rows.js';
import { EmployeesRepository } from '../employees/employees.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { type SalaryRecordRow, SalaryRepository } from './salary.repository.js';

@Injectable()
export class SalariesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly salaries: SalaryRepository,
    private readonly employees: EmployeesRepository,
    private readonly people: EmployeesService,
    private readonly audit: AuditRepository,
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

  /**
   * "Change salary" (architecture.md → salary change sequence), all in one transaction:
   * lock the person, check the version the client saw, plan with the domain rules, close and
   * insert, bump the version, and append the audit event. Any failure rolls everything back.
   */
  async change(
    employeeId: string,
    request: SalaryChangeRequest,
    expectedVersion: number,
    actor: AuthenticatedUser,
    requestId: string | null,
  ): Promise<SalaryChangeResult> {
    const { inserted, version } = await this.db.transaction(async (tx) => {
      const employee = await this.people.lockAtVersion(
        tx,
        employeeId,
        expectedVersion,
      );

      const history = await this.salaries.history(employeeId, tx);
      const plan = planSalaryChange(
        history.map(toDomainRecord),
        {
          effectiveFrom: request.effectiveFrom,
          amount: Money.of(
            BigInt(request.amount.amountMinor),
            request.amount.currency,
          ),
          frequency: request.frequency,
          reason: request.reason,
          note: request.note,
        },
        { countryCurrency: employee.currencyCode },
      );
      const record = await this.salaries.applyPlan(
        tx,
        employeeId,
        plan,
        actor.id,
      );
      const newVersion = await this.employees.bumpVersion(tx, employeeId);

      const closed = new Set(plan.close.map((c) => c.recordId));
      await this.audit.append(tx, {
        actorUserId: actor.id,
        action: 'salary.changed',
        entityType: 'employee',
        entityId: employeeId,
        before: {
          records: history
            .filter((r) => closed.has(r.id))
            .map(toSalaryRecordJson),
        },
        after: { closed: plan.close, inserted: toSalaryRecordJson(record) },
        requestId,
      });
      return { inserted: record, version: newVersion };
    });

    const profile = await this.people.profile(employeeId, actor);
    return {
      record: toSalaryRecordJson(inserted),
      pay: profile.pay ?? null,
      version,
    };
  }
}

function toDomainRecord(row: SalaryRecordRow): SalaryRecord {
  return {
    id: row.id,
    amount: Money.of(row.amountMinor, row.currency),
    frequency: row.frequency,
    effectiveFrom: row.effectiveFrom,
    effectiveTo: row.effectiveTo,
    reason: row.reason,
  };
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
