import { z } from 'zod';
import { EmployeePaySchema } from '../employees/employee-list-item.schema.js';
import { PAY_FREQUENCIES } from '../employees/employee-enums.js';
import { MoneyJsonSchema } from '../money/money-json.schema.js';

/** Why a salary changed (glossary). `hire` is set when a person is created, never by a change. */
export const SALARY_REASONS = [
  'hire',
  'merit',
  'promotion',
  'market_adjustment',
  'correction',
  'transfer',
  'other',
] as const;
export type SalaryReasonName = (typeof SALARY_REASONS)[number];
export const CHANGE_REASONS = SALARY_REASONS.filter(
  (reason): reason is Exclude<SalaryReasonName, 'hire'> => reason !== 'hire',
);

/** One effective-dated record, valid on [effectiveFrom, effectiveTo). */
export const SalaryRecordJsonSchema = z.object({
  id: z.uuid(),
  salary: MoneyJsonSchema,
  frequency: z.enum(PAY_FREQUENCIES),
  effectiveFrom: z.iso.date(),
  /** null: until further notice. Equal to effectiveFrom: superseded by a correction. */
  effectiveTo: z.iso.date().nullable(),
  reason: z.enum(SALARY_REASONS),
  note: z.string().nullable(),
  createdAt: z.string(),
});
export type SalaryRecordJson = z.infer<typeof SalaryRecordJsonSchema>;

/** Newest first (profile → Salary history). */
export const SalaryHistorySchema = z.array(SalaryRecordJsonSchema);

/** POST /employees/:id/salary-changes — "Change salary" (ui-screens.md §6). */
export const SalaryChangeRequestSchema = z.object({
  effectiveFrom: z.iso.date(),
  amount: MoneyJsonSchema,
  frequency: z.enum(PAY_FREQUENCIES),
  reason: z.enum(CHANGE_REASONS),
  note: z.string().trim().max(500).optional(),
});
export type SalaryChangeRequest = z.infer<typeof SalaryChangeRequestSchema>;

/** The new record, the person's pay afterwards and the new version (for the next If-Match). */
export const SalaryChangeResultSchema = z.object({
  record: SalaryRecordJsonSchema,
  pay: EmployeePaySchema.nullable(),
  version: z.number().int(),
});
export type SalaryChangeResult = z.infer<typeof SalaryChangeResultSchema>;
