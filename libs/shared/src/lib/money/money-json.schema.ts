import { z } from 'zod';

/**
 * Money in JSON (api.md): minor units as a string, because a JSON number cannot carry every
 * bigint exactly, and the currency code always next to it. `{ "amountMinor": "7850000",
 * "currency": "EUR" }` is €78,500.00.
 */
export const MoneyJsonSchema = z.object({
  amountMinor: z.string().regex(/^-?\d+$/),
  currency: z.string().regex(/^[A-Z]{3}$/),
});

export type MoneyJson = z.infer<typeof MoneyJsonSchema>;
