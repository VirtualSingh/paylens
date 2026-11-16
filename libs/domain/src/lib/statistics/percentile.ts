import { divideRoundingHalfEven } from '../money/rounding.js';

/** A percentile as an exact fraction, so no float ever positions a money value. */
export interface Fraction {
  readonly numerator: bigint;
  readonly denominator: bigint;
}

export const P25: Fraction = { numerator: 1n, denominator: 4n };
export const MEDIAN: Fraction = { numerator: 1n, denominator: 2n };
export const P75: Fraction = { numerator: 3n, denominator: 4n };
export const P90: Fraction = { numerator: 9n, denominator: 10n };

/**
 * The continuous percentile of integer amounts (minor units), as Postgres's
 * `percentile_cont` defines it: position p × (n − 1) in the sorted values, interpolating
 * linearly between neighbours. The interpolated value is rounded half-even to a whole minor
 * unit, the rounding every PayLens money figure uses (analytics.md, ADR-004).
 */
export function percentileCont(
  values: readonly bigint[],
  percentile: Fraction,
): bigint | null {
  if (values.length === 0) {
    return null;
  }
  const sorted = values.toSorted((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  // position = (n − 1) × p = whole + remainder / denominator
  const scaled = BigInt(sorted.length - 1) * percentile.numerator;
  const whole = scaled / percentile.denominator;
  const remainder = scaled % percentile.denominator;
  const lower = valueAt(sorted, whole);
  if (remainder === 0n) {
    return lower;
  }
  const upper = valueAt(sorted, whole + 1n);
  // Round the whole value, not just the step: 1 + ½ is 1.5, which rounds to 2.
  return divideRoundingHalfEven(
    lower * percentile.denominator + (upper - lower) * remainder,
    percentile.denominator,
  );
}

function valueAt(sorted: readonly bigint[], position: bigint): bigint {
  const value = sorted[Number(position)];
  /* v8 ignore next 3 -- positions stay within 0 … n − 1 by construction */
  if (value === undefined) {
    throw new RangeError('Percentile position outside the values');
  }
  return value;
}
