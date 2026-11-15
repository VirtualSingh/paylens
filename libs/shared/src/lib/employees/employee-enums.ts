// Words shared by the API contract and the UI (glossary.md). The database enums in
// apps/api/src/db/schema/enums.ts use the same values.

export const EMPLOYEE_STATUSES = ['active', 'on_leave', 'terminated'] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const BAND_POSITIONS = ['below', 'within', 'above'] as const;
export type BandPositionName = (typeof BAND_POSITIONS)[number];

export const GENDERS = ['female', 'male'] as const;
export type Gender = (typeof GENDERS)[number];

export const EMPLOYMENT_TYPES = [
  'full_time',
  'part_time',
  'contractor',
] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
