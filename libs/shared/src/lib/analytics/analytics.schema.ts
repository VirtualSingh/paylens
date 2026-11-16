import { z } from 'zod';
import { MoneyJsonSchema } from '../money/money-json.schema.js';
import { BAND_POSITIONS } from '../employees/employee-enums.js';
import { CurrencyCodeSchema } from '../reference/reference.schema.js';

/** Every analytics question: in which currency, and on which day (default: today). */
export const AnalyticsQuerySchema = z.object({
  reportingCurrency: CurrencyCodeSchema.default('USD'),
  asOf: z.iso.date().optional(),
});
export type AnalyticsQuery = z.infer<typeof AnalyticsQuerySchema>;

/**
 * `GET /analytics/summary` — the dashboard's headline figures (analytics.md). Active people
 * only; amounts converted per person with the rate valid on `asOf`, then summed in minor units.
 */
export const AnalyticsSummarySchema = z.object({
  asOf: z.iso.date(),
  reportingCurrency: z.string(),
  headcount: z.number().int(),
  annualPayroll: MoneyJsonSchema,
  /** Median annual salary in the reporting currency; null with nobody to measure. */
  medianAnnual: MoneyJsonSchema.nullable(),
  bandPositions: z.object({
    below: z.number().int(),
    within: z.number().int(),
    above: z.number().int(),
    /** People with no band for their level and country on `asOf`. */
    noBand: z.number().int(),
  }),
  /** within ÷ (below + within + above), 4 decimals; null when nobody has a band. */
  withinBandShare: z.number().nullable(),
  /** People left out of the money figures because no FX rate existed on `asOf`. */
  unconvertedCount: z.number().int(),
});
export type AnalyticsSummary = z.infer<typeof AnalyticsSummarySchema>;

/** What a breakdown can be grouped by (an allowlist: nothing else reaches the query). */
export const BREAKDOWN_DIMENSIONS = ['country', 'department', 'level'] as const;
export type BreakdownDimension = (typeof BREAKDOWN_DIMENSIONS)[number];

/** `GET /analytics/breakdown?by=country` — "how does payroll split by …?" */
export const AnalyticsBreakdownQuerySchema = AnalyticsQuerySchema.extend({
  by: z.enum(BREAKDOWN_DIMENSIONS),
});
export type AnalyticsBreakdownQuery = z.infer<
  typeof AnalyticsBreakdownQuerySchema
>;

/** One group: its people, payroll and spread (p25 close to p75 means compression). */
export const BreakdownRowSchema = z.object({
  key: z.string(),
  label: z.string(),
  headcount: z.number().int(),
  annualPayroll: MoneyJsonSchema,
  p25: MoneyJsonSchema.nullable(),
  median: MoneyJsonSchema.nullable(),
  p75: MoneyJsonSchema.nullable(),
  withinBandShare: z.number().nullable(),
  unconvertedCount: z.number().int(),
});
export type BreakdownRow = z.infer<typeof BreakdownRowSchema>;

/** Groups by payroll, largest first; levels in ladder order instead. */
export const AnalyticsBreakdownSchema = z.object({
  asOf: z.iso.date(),
  reportingCurrency: z.string(),
  by: z.enum(BREAKDOWN_DIMENSIONS),
  rows: z.array(BreakdownRowSchema),
});
export type AnalyticsBreakdown = z.infer<typeof AnalyticsBreakdownSchema>;

/** One person in the strip plot: by employee code, never by name (analytics.md). */
export const BandPointSchema = z.object({
  employeeCode: z.string(),
  /** (annual − min) ÷ (max − min), 4 decimals: below 0 under the band, above 1 over it. */
  penetration: z.number(),
  position: z.enum(BAND_POSITIONS),
});

/**
 * `GET /analytics/band-positioning` — where people sit in their bands, per level in ladder
 * order (the dashboard's hero). Points only for HR managers and admins; viewers get counts.
 */
export const BandPositioningSchema = z.object({
  asOf: z.iso.date(),
  levels: z.array(
    z.object({
      levelCode: z.string(),
      below: z.number().int(),
      within: z.number().int(),
      above: z.number().int(),
      points: z.array(BandPointSchema).optional(),
    }),
  ),
});
export type BandPositioning = z.infer<typeof BandPositioningSchema>;
export type BandPoint = z.infer<typeof BandPointSchema>;
