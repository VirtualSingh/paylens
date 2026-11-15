import { z } from 'zod';
import { MoneyJsonSchema } from '../money/money-json.schema.js';
import {
  BAND_POSITIONS,
  EMPLOYEE_STATUSES,
  PAY_FREQUENCIES,
} from './employee-enums.js';

/** Current pay of one person, with the band metrics (glossary). */
export const EmployeePaySchema = z.object({
  /** As recorded, in local currency, per pay frequency. */
  salary: MoneyJsonSchema,
  frequency: z.enum(PAY_FREQUENCIES),
  annualLocal: MoneyJsonSchema,
  /** In the reporting currency at the latest rate; null when no rate is known. */
  annualReporting: z
    .object({ money: MoneyJsonSchema, asOf: z.string() })
    .nullable(),
  band: z
    .object({
      min: MoneyJsonSchema,
      mid: MoneyJsonSchema,
      max: MoneyJsonSchema,
    })
    .nullable(),
  compaRatio: z.number().nullable(),
  rangePenetration: z.number().nullable(),
  bandPosition: z.enum(BAND_POSITIONS).nullable(),
});
export type EmployeePay = z.infer<typeof EmployeePaySchema>;

/** One row of the people directory. */
export const EmployeeListItemSchema = z.object({
  id: z.uuid(),
  employeeCode: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  workEmail: z.string(),
  countryCode: z.string(),
  department: z.object({ code: z.string(), name: z.string() }),
  levelCode: z.string(),
  jobTitle: z.string(),
  status: z.enum(EMPLOYEE_STATUSES),
  hireDate: z.string(),
  /**
   * null: no current salary (e.g. terminated). Absent: the reader may not see individual pay
   * (viewers get the masked variant, api.md → Roles).
   */
  pay: EmployeePaySchema.nullable().optional(),
});
export type EmployeeListItem = z.infer<typeof EmployeeListItemSchema>;

/** The list envelope (api.md → Pagination). */
export function pageOf<Item extends z.ZodType>(item: Item) {
  return z.object({
    data: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
  });
}

export const EmployeeDirectoryPageSchema = pageOf(EmployeeListItemSchema);
export type EmployeeDirectoryPage = z.infer<typeof EmployeeDirectoryPageSchema>;
