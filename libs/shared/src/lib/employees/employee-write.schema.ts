import { z } from 'zod';
import { MoneyJsonSchema } from '../money/money-json.schema.js';
import {
  CountryCodeSchema,
  LevelCodeSchema,
} from '../reference/reference.schema.js';
import {
  EMPLOYMENT_TYPES,
  GENDERS,
  PAY_FREQUENCIES,
} from './employee-enums.js';

const NameSchema = z.string().trim().min(1).max(100);
const LookupCodeSchema = z.string().trim().min(1).max(32);

/**
 * Share of full time: "1", "0.5", "0.75". A decimal string, like every other exact number in
 * the contract, so it never passes through a float on the way to numeric(3,2).
 */
export const FteSchema = z
  .string()
  .regex(/^(0\.\d{1,2}|1(\.0{1,2})?)$/, 'Use a decimal from 0.01 to 1')
  .refine((fte) => !/^0\.0{1,2}$/.test(fte), 'FTE must be more than 0');

/** Fields a person is created with and HR may edit later (F-10). */
const EmploymentDetails = {
  firstName: NameSchema,
  lastName: NameSchema,
  workEmail: z.email().max(254),
  departmentCode: LookupCodeSchema,
  jobFamilyCode: LookupCodeSchema,
  levelCode: LevelCodeSchema,
  jobTitle: z.string().trim().min(1).max(120),
  /** null: reports to nobody (the top of the org). */
  managerId: z.uuid().nullable(),
  employmentType: z.enum(EMPLOYMENT_TYPES),
  fte: FteSchema,
  /** Recorded for pay-gap analysis only; visible to HR managers and admins (security.md). */
  gender: z.enum(GENDERS),
};

/**
 * `POST /employees` — a new person with the salary they are hired on. Country and hire date
 * are fixed after creation (a transfer is v2, features.md F-10).
 */
export const CreateEmployeeRequestSchema = z.object({
  ...EmploymentDetails,
  managerId: EmploymentDetails.managerId.default(null),
  fte: FteSchema.default('1'),
  countryCode: CountryCodeSchema,
  hireDate: z.iso.date(),
  /** Starts on the hire date with reason `hire`. */
  salary: z.object({
    amount: MoneyJsonSchema,
    frequency: z.enum(PAY_FREQUENCIES),
  }),
});
export type CreateEmployeeRequest = z.infer<typeof CreateEmployeeRequestSchema>;

/**
 * `PATCH /employees/:id` — any of the employment details, with If-Match. Strict: country and
 * hire date are fixed, and status has its own endpoint, so sending them is an error rather
 * than something silently ignored.
 */
export const UpdateEmployeeRequestSchema = z
  .strictObject(EmploymentDetails)
  .partial()
  .refine((edit) => Object.values(edit).some((value) => value !== undefined), {
    message: 'Send at least one field to change',
  });
export type UpdateEmployeeRequest = z.infer<typeof UpdateEmployeeRequestSchema>;
