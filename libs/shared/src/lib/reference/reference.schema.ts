import { z } from 'zod';
import { MoneyJsonSchema } from '../money/money-json.schema.js';

// The codes people type and URLs carry. One definition each, so every query validates them
// the same way (the directory filters use these too).

/** ISO 3166-1 alpha-2, upper case: "IN". */
export const CountryCodeSchema = z.string().regex(/^[A-Z]{2}$/);
/** ISO 4217, upper case: "INR". */
export const CurrencyCodeSchema = z.string().regex(/^[A-Z]{3}$/);
/** The job ladder: IC1–IC6 and M1–M4 (glossary → Level). */
export const LevelCodeSchema = z.string().regex(/^(IC[1-6]|M[1-4])$/);

export const CountrySchema = z.object({
  code: z.string(),
  name: z.string(),
  /** Salaries in this country are paid in this currency (one per country). */
  currencyCode: z.string(),
  region: z.string(),
});
export type Country = z.infer<typeof CountrySchema>;

export const DepartmentSchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type Department = z.infer<typeof DepartmentSchema>;

export const JobFamilySchema = z.object({
  code: z.string(),
  name: z.string(),
});
export type JobFamily = z.infer<typeof JobFamilySchema>;

export const JOB_TRACKS = ['ic', 'manager'] as const;
export const JobLevelSchema = z.object({
  code: z.string(),
  track: z.enum(JOB_TRACKS),
  /** Seniority; an M1 sits at the same rank as an IC4. */
  rank: z.number().int(),
});
export type JobLevel = z.infer<typeof JobLevelSchema>;

/** `GET /pay-bands` (api.md → Reference data). Without `asOf`: today. */
export const PayBandsQuerySchema = z.object({
  country: CountryCodeSchema.optional(),
  level: LevelCodeSchema.optional(),
  asOf: z.iso.date().optional(),
});
export type PayBandsQuery = z.infer<typeof PayBandsQuerySchema>;

/** One band (annual, local currency) and how many people it holds on the as-of date. */
export const PayBandSchema = z.object({
  id: z.uuid(),
  countryCode: z.string(),
  levelCode: z.string(),
  min: MoneyJsonSchema,
  mid: MoneyJsonSchema,
  max: MoneyJsonSchema,
  effectiveFrom: z.iso.date(),
  effectiveTo: z.iso.date().nullable(),
  /** People at this level and country with a salary on the as-of date. */
  employeeCount: z.number().int(),
  /** Of those, how many are paid below min and above max (outliers, glossary). */
  belowCount: z.number().int(),
  aboveCount: z.number().int(),
});
export type PayBand = z.infer<typeof PayBandSchema>;

/** `GET /fx-rates`: optional currency and an inclusive date range. */
export const FxRatesQuerySchema = z
  .object({
    quote: CurrencyCodeSchema.optional(),
    from: z.iso.date().optional(),
    to: z.iso.date().optional(),
  })
  .refine(
    ({ from, to }) => from === undefined || to === undefined || from <= to,
    { message: 'The range must end on or after its start', path: ['to'] },
  );
export type FxRatesQuery = z.infer<typeof FxRatesQuerySchema>;

/** On `asOf`, 1 USD = `rate` units of `quoteCurrency`. `rate` is a decimal string, never a float. */
export const FxRateSchema = z.object({
  baseCurrency: z.literal('USD'),
  quoteCurrency: z.string(),
  rate: z.string(),
  asOf: z.iso.date(),
  source: z.string(),
});
export type FxRate = z.infer<typeof FxRateSchema>;
