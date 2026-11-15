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

/** `?country=IN` arrives as a string, `?country=IN&country=DE` as an array: always an array. */
function listOf<T extends z.ZodType>(item: T) {
  return z.preprocess(
    (value) =>
      value === undefined ? [] : Array.isArray(value) ? value : [value],
    z.array(item),
  );
}

/** "annualReporting:desc,lastName" → [{ field, direction }, …]; direction defaults to asc. */
const SortSchema = z.preprocess(
  (value) =>
    typeof value === 'string'
      ? value.split(',').map((part) => {
          const [field, direction = 'asc'] = part.trim().split(':');
          return { field, direction };
        })
      : value,
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
  sort: SortSchema.default([{ field: 'lastName', direction: 'asc' }]),
  reportingCurrency: CurrencyCodeSchema.default('USD'),
});

export type EmployeeDirectoryQuery = z.infer<
  typeof EmployeeDirectoryQuerySchema
>;
