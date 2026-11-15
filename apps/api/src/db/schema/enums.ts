import { pgEnum } from 'drizzle-orm/pg-core';

// Enumerations from docs/vault/design/data-model.md; the TypeScript unions in libs/domain and
// libs/shared use the same words (glossary.md).

export const employmentType = pgEnum('employment_type', [
  'full_time',
  'part_time',
  'contractor',
]);

export const employeeStatus = pgEnum('employee_status', [
  'active',
  'on_leave',
  'terminated',
]);

/** D-2 (2026-11-15): exactly two values, required on every employee. */
export const gender = pgEnum('gender', ['female', 'male']);

export const payFrequency = pgEnum('pay_frequency', ['annual', 'monthly']);

export const salaryReason = pgEnum('salary_reason', [
  'hire',
  'merit',
  'promotion',
  'market_adjustment',
  'correction',
  'transfer',
  'other',
]);

export const userRole = pgEnum('user_role', ['admin', 'hr_manager', 'viewer']);
