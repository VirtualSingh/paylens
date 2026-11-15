import { DomainError } from '../errors.js';
import type { IsoDate } from '../time/iso-date.js';

export type EmploymentStatus = 'active' | 'on_leave' | 'terminated';

/** What the rules need to know about the person today. */
export interface EmploymentFacts {
  readonly status: EmploymentStatus;
  readonly hireDate: IsoDate;
  /** The salary record with no end date, if any. */
  readonly openSalary: {
    readonly id: string;
    readonly effectiveFrom: IsoDate;
  } | null;
}

export interface StatusChange {
  readonly status: EmploymentStatus;
  readonly effectiveDate: IsoDate;
}

/** What to write, in one transaction with the status update. */
export interface StatusChangePlan {
  readonly status: EmploymentStatus;
  readonly terminationDate: IsoDate | null;
  readonly closeSalary: {
    readonly recordId: string;
    readonly effectiveTo: IsoDate;
  } | null;
}

export class EmployeeTerminatedError extends DomainError {
  readonly code = 'employee_terminated';

  constructor() {
    super('This person has left; rehiring them means adding a new employee');
  }
}

export class StatusUnchangedError extends DomainError {
  readonly code = 'status_unchanged';

  constructor(status: EmploymentStatus) {
    super(`This person is already ${status.replace('_', ' ')}`);
  }
}

export class StatusDateBeforeHireError extends DomainError {
  readonly code = 'status_date_before_hire';

  constructor(hireDate: IsoDate) {
    super(`The date must be on or after the hire date, ${hireDate}`);
  }
}

export class TerminationBeforeCurrentSalaryError extends DomainError {
  readonly code = 'termination_before_current_salary';

  constructor(salaryFrom: IsoDate) {
    super(
      `The termination date must be after ${salaryFrom}, when the current salary started`,
    );
  }
}

/**
 * Leave, return and termination (F-11). Terminated is final: there are no hard deletes and
 * history stays, so a rehire is a new employee record. A termination closes the open salary
 * record on the termination date (the convention the seed uses, seed.md), which must
 * therefore fall after that record started.
 */
export function planStatusChange(
  facts: EmploymentFacts,
  change: StatusChange,
): StatusChangePlan {
  if (facts.status === 'terminated') {
    throw new EmployeeTerminatedError();
  }
  if (change.status === facts.status) {
    throw new StatusUnchangedError(facts.status);
  }
  if (change.effectiveDate < facts.hireDate) {
    throw new StatusDateBeforeHireError(facts.hireDate);
  }
  if (change.status !== 'terminated') {
    return { status: change.status, terminationDate: null, closeSalary: null };
  }

  const open = facts.openSalary;
  if (open !== null && change.effectiveDate <= open.effectiveFrom) {
    throw new TerminationBeforeCurrentSalaryError(open.effectiveFrom);
  }
  return {
    status: 'terminated',
    terminationDate: change.effectiveDate,
    closeSalary:
      open === null
        ? null
        : { recordId: open.id, effectiveTo: change.effectiveDate },
  };
}
