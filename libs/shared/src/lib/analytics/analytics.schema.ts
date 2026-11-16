import { z } from 'zod';
import { MoneyJsonSchema } from '../money/money-json.schema.js';
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
