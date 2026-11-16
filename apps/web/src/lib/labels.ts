import type {
  EmployeeStatus,
  EmploymentType,
  Gender,
  SalaryReasonName,
} from '@paylens/shared';

// The words people see for the API's values, in one place (glossary.md: same word, same thing).

export const STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: 'Active',
  on_leave: 'On leave',
  terminated: 'Terminated',
};

export const REASON_LABELS: Record<SalaryReasonName, string> = {
  hire: 'Hire',
  merit: 'Merit',
  promotion: 'Promotion',
  market_adjustment: 'Market adjustment',
  correction: 'Correction',
  transfer: 'Transfer',
  other: 'Other',
};

export const EMPLOYMENT_LABELS: Record<EmploymentType, string> = {
  full_time: 'Full-time',
  part_time: 'Part-time',
  contractor: 'Contractor',
};

export const GENDER_LABELS: Record<Gender, string> = {
  female: 'Female',
  male: 'Male',
};

/** Audit actions, as a person would say what happened. */
export const ACTION_LABELS: Readonly<Record<string, string>> = {
  'employee.created': 'Added',
  'employee.updated': 'Details edited',
  'employee.status_changed': 'Status changed',
  'salary.changed': 'Salary changed',
};

/** Field names in audit diffs. */
export const FIELD_LABELS: Readonly<Record<string, string>> = {
  firstName: 'First name',
  lastName: 'Last name',
  workEmail: 'Work email',
  departmentCode: 'Department',
  jobFamilyCode: 'Job family',
  levelCode: 'Level',
  jobTitle: 'Job title',
  managerId: 'Manager',
  employmentType: 'Employment type',
  fte: 'FTE',
  gender: 'Gender',
  status: 'Status',
  terminationDate: 'Termination date',
};
