import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  assertNoReportingCycle,
  Money,
  nextEmployeeCode,
  planSalaryChange,
  planStatusChange,
} from '@paylens/domain';
import type {
  CreateEmployeeRequest,
  EmployeeProfile,
  EmployeeStatusChangeRequest,
  UpdateEmployeeRequest,
} from '@paylens/shared';
import { AuditRepository } from '../audit/audit.repository.js';
import type { AuthenticatedUser } from '../auth/authenticated-user.js';
import {
  type FieldError,
  RequestValidationError,
} from '../common/zod-validation.pipe.js';
import { type Database, DATABASE } from '../db/database.js';
import { isUniqueViolation } from '../db/postgres-errors.js';
import {
  type EmployeeDetails,
  EmployeesRepository,
  type NewEmployee,
  type ResolvedReferences,
} from '../employees/employees.repository.js';
import { EmployeesService } from '../employees/employees.service.js';
import { toSalaryRecordJson } from '../salaries/salaries.service.js';
import { SalaryRepository } from '../salaries/salary.repository.js';

/** Changes to who a person is and how they are employed (F-10, F-11); pay has its own flow. */
@Injectable()
export class EmployeeChangesService {
  constructor(
    @Inject(DATABASE) private readonly db: Database,
    private readonly employees: EmployeesRepository,
    private readonly people: EmployeesService,
    private readonly salaries: SalaryRepository,
    private readonly audit: AuditRepository,
  ) {}

  /**
   * "Add employee", all in one transaction: resolve the codes, plan the hire salary with the
   * domain rules, take the next employee code, insert the person and their first salary
   * record, and audit it. Any failure leaves no trace.
   */
  async create(
    request: CreateEmployeeRequest,
    actor: AuthenticatedUser,
    requestId: string | null,
  ): Promise<EmployeeProfile> {
    const id = await this.db.transaction(async (tx) => {
      const references = await this.employees.resolveReferences(tx, request);
      const errors = referenceErrors(request, references);
      // The null checks repeat what `errors` says, so TypeScript knows the ids exist below.
      const { currencyCode, departmentId, jobFamilyId, jobLevelId } =
        references;
      if (
        errors.length > 0 ||
        currencyCode === null ||
        departmentId === null ||
        jobFamilyId === null ||
        jobLevelId === null
      ) {
        throw new RequestValidationError(errors);
      }

      const hireSalary = planSalaryChange(
        [],
        {
          effectiveFrom: request.hireDate,
          amount: Money.of(
            BigInt(request.salary.amount.amountMinor),
            request.salary.amount.currency,
          ),
          frequency: request.salary.frequency,
          reason: 'hire',
        },
        { countryCurrency: currencyCode },
      );
      const employeeCode = nextEmployeeCode(
        await this.employees.highestCodeLocked(tx),
      );
      const id = await this.insert(tx, {
        employeeCode,
        firstName: request.firstName,
        lastName: request.lastName,
        workEmail: request.workEmail,
        countryCode: request.countryCode,
        departmentId,
        jobFamilyId,
        jobLevelId,
        jobTitle: request.jobTitle,
        managerId: request.managerId,
        employmentType: request.employmentType,
        fte: request.fte,
        hireDate: request.hireDate,
        gender: request.gender,
      });
      const record = await this.salaries.applyPlan(
        tx,
        id,
        hireSalary,
        actor.id,
      );

      await this.audit.append(tx, {
        actorUserId: actor.id,
        action: 'employee.created',
        entityType: 'employee',
        entityId: id,
        before: null,
        after: { ...request, employeeCode, salary: toSalaryRecordJson(record) },
        requestId,
      });
      return id;
    });

    return this.people.profile(id, actor);
  }

  /**
   * "Edit employment details" with If-Match, in one transaction: lock the person, check the
   * version, keep only the fields that really change, check their codes and the reporting
   * line, write and audit. An edit that changes nothing writes nothing and keeps the version.
   */
  async update(
    id: string,
    request: UpdateEmployeeRequest,
    expectedVersion: number,
    actor: AuthenticatedUser,
    requestId: string | null,
  ): Promise<EmployeeProfile> {
    await this.db.transaction(async (tx) => {
      await this.people.lockAtVersion(tx, id, expectedVersion);
      const current = await this.employees.editableFields(tx, id);
      if (current === null) {
        throw new NotFoundException('There is no employee with this id');
      }

      const { before, after } = differences(current, request);
      if (Object.keys(after).length === 0) {
        return;
      }
      const errors = referenceErrors(
        after,
        await this.employees.resolveReferences(tx, after),
      );
      if (errors.length > 0) {
        throw new RequestValidationError(errors);
      }
      if (after.managerId !== undefined && after.managerId !== null) {
        assertNoReportingCycle(
          id,
          await this.employees.managerLine(tx, after.managerId),
        );
      }

      await uniqueEmail(() => this.employees.update(tx, id, after));
      await this.audit.append(tx, {
        actorUserId: actor.id,
        action: 'employee.updated',
        entityType: 'employee',
        entityId: id,
        before,
        after,
        requestId,
      });
    });

    return this.people.profile(id, actor);
  }

  /**
   * Leave, return or termination (F-11) with If-Match, in one transaction: lock the person,
   * check the version, plan with the domain rules, close the open salary on a termination,
   * write the status and audit it.
   */
  async changeStatus(
    id: string,
    request: EmployeeStatusChangeRequest,
    expectedVersion: number,
    actor: AuthenticatedUser,
    requestId: string | null,
  ): Promise<EmployeeProfile> {
    await this.db.transaction(async (tx) => {
      await this.people.lockAtVersion(tx, id, expectedVersion);
      const facts = await this.employees.employmentFacts(tx, id);
      if (facts === null) {
        throw new NotFoundException('There is no employee with this id');
      }

      const plan = planStatusChange(facts, request);
      if (plan.closeSalary !== null) {
        await this.salaries.close(tx, id, plan.closeSalary);
      }
      await this.employees.setStatus(tx, id, plan);
      await this.audit.append(tx, {
        actorUserId: actor.id,
        action: 'employee.status_changed',
        entityType: 'employee',
        entityId: id,
        before: {
          status: facts.status,
          terminationDate: facts.terminationDate,
        },
        after: {
          status: plan.status,
          effectiveDate: request.effectiveDate,
          terminationDate: plan.terminationDate,
          closedSalaryRecordId: plan.closeSalary?.recordId ?? null,
        },
        requestId,
      });
    });

    return this.people.profile(id, actor);
  }

  private insert(tx: Database, person: NewEmployee): Promise<string> {
    return uniqueEmail(() => this.employees.insert(tx, person));
  }
}

/** The work email is unique (case-insensitive, citext); a duplicate is a 409, not a 500. */
async function uniqueEmail<T>(write: () => Promise<T>): Promise<T> {
  try {
    return await write();
  } catch (error) {
    if (isUniqueViolation(error, 'employees_work_email_unique')) {
      throw new ConflictException('Someone already has this work email.');
    }
    throw error;
  }
}

const EDITABLE_FIELDS = [
  'firstName',
  'lastName',
  'workEmail',
  'departmentCode',
  'jobFamilyCode',
  'levelCode',
  'jobTitle',
  'managerId',
  'employmentType',
  'fte',
  'gender',
] as const satisfies readonly (keyof EmployeeDetails)[];

/** The fields the request really changes: their old values (before) and new ones (after). */
function differences(
  current: EmployeeDetails,
  request: UpdateEmployeeRequest,
): { before: Partial<EmployeeDetails>; after: Partial<EmployeeDetails> } {
  const before: Partial<EmployeeDetails> = {};
  const after: Partial<EmployeeDetails> = {};
  const compare = <Field extends keyof EmployeeDetails>(field: Field) => {
    const wanted = request[field];
    if (wanted !== undefined && wanted !== current[field]) {
      before[field] = current[field];
      after[field] = wanted;
    }
  };
  EDITABLE_FIELDS.forEach(compare);
  return { before, after };
}

/** Every code in the request that points at nothing, as field errors for the form. */
function referenceErrors(
  request: {
    readonly countryCode?: string;
    readonly departmentCode?: string;
    readonly jobFamilyCode?: string;
    readonly levelCode?: string;
    readonly managerId?: string | null;
  },
  found: ResolvedReferences,
): FieldError[] {
  const errors: FieldError[] = [];
  const check = (
    asked: unknown,
    match: unknown,
    path: string,
    message: string,
  ) => {
    if (asked !== undefined && asked !== null && match === null) {
      errors.push({ path, message });
    }
  };
  check(
    request.countryCode,
    found.currencyCode,
    'countryCode',
    'There is no country with this code',
  );
  check(
    request.departmentCode,
    found.departmentId,
    'departmentCode',
    'There is no department with this code',
  );
  check(
    request.jobFamilyCode,
    found.jobFamilyId,
    'jobFamilyCode',
    'There is no job family with this code',
  );
  check(
    request.levelCode,
    found.jobLevelId,
    'levelCode',
    'There is no level with this code',
  );
  // Someone who has left cannot manage anyone.
  const manager =
    found.managerStatus === 'terminated' ? null : found.managerStatus;
  check(
    request.managerId,
    manager,
    'managerId',
    'There is no current employee with this id',
  );
  return errors;
}
