import { z } from 'zod';
import { PaginationQuerySchema } from '../pagination/pagination-query.schema.js';
import {
  CountryCodeSchema,
  CurrencyCodeSchema,
  LevelCodeSchema,
} from '../reference/reference.schema.js';
import { BAND_POSITIONS, EMPLOYEE_STATUSES } from './employee-enums.js';

/** Columns the directory may be sorted by (api.md → sort allowlist). */
export const EMPLOYEE_SORT_FIELDS = [
  'lastName',
  'hireDate',
  'country',
  'department',
  'level',
  'annualReporting',
  'compaRatio',
] as const;
export type EmployeeSortField = (typeof EMPLOYEE_SORT_FIELDS)[number];

/**
 * `?country=IN` arrives as a string, `?country=IN&country=DE` as an array, no parameter as
 * nothing: always an array. Written as a union rather than a preprocess so the generated
 * API docs can show what a client may send.
 */
function listOf<T extends z.ZodType>(item: T) {
  return z
    .union([item, z.array(item)])
    .optional()
    .transform((value): z.output<T>[] =>
      value === undefined ? [] : Array.isArray(value) ? value : [value],
    );
}

/** "annualReporting:desc,lastName" → [{ field, direction }, …]; direction defaults to asc. */
const SortSchema = z
  .string()
  .transform((value) =>
    value.split(',').map((part) => {
      const [field, direction = 'asc'] = part.trim().split(':');
      return { field, direction };
    }),
  )
  .pipe(
    z
      .array(
        z.object({
          field: z.enum(EMPLOYEE_SORT_FIELDS),
          direction: z.enum(['asc', 'desc']),
        }),
      )
      .min(1)
      .max(3),
  );

/** `GET /api/v1/employees` query (api.md → Employees, Pagination, Filtering). */
export const EmployeeDirectoryQuerySchema = PaginationQuerySchema.extend({
  /** Free text over name and employee code (trigram search). */
  q: z.string().trim().min(2).max(100).optional(),
  country: listOf(CountryCodeSchema),
  department: listOf(z.string().min(1).max(32)),
  level: listOf(LevelCodeSchema),
  status: listOf(z.enum(EMPLOYEE_STATUSES)),
  bandPosition: listOf(z.enum(BAND_POSITIONS)),
  managerId: z.uuid().optional(),
  // prefault: the default is a query-string value, parsed like one the client sent.
  sort: SortSchema.prefault('lastName:asc').meta({
    description:
      'Up to three fields, comma-separated, each optionally :asc or :desc; e.g. annualReporting:desc,lastName',
  }),
  reportingCurrency: CurrencyCodeSchema.default('USD'),
});

export type EmployeeDirectoryQuery = z.infer<
  typeof EmployeeDirectoryQuerySchema
>;
