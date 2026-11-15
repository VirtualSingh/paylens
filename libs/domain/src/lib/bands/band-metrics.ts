import type { Money } from '../money/money.js';
import { divideRoundingHalfEven } from '../money/rounding.js';

/** A salary range for one job level in one country, annual, in local currency. */
export interface PayBand {
  readonly min: Money;
  readonly mid: Money;
  readonly max: Money;
}

/** Where a salary sits relative to its band; both boundaries count as within. */
export type BandPosition = 'below' | 'within' | 'above';

export interface BandMetrics {
  /** Salary ÷ midpoint. 1 = at midpoint; 0.9 = 10% below it. */
  readonly compaRatio: number;
  /** (Salary − min) ÷ (max − min). 0 = at min, 1 = at max; outside 0–1 = outside the band. */
  readonly rangePenetration: number;
  readonly position: BandPosition;
}

/** Ratios are reported to 4 decimals, rounded half-even, so results are reproducible. */
const RATIO_SCALE = 10_000n;

/** Compa-ratio, range penetration and position of an annual salary in its band (glossary). */
export function bandMetrics(annualSalary: Money, band: PayBand): BandMetrics {
  assertValidBand(band);
  const aboveMin = annualSalary.subtract(band.min).amountMinor;
  const width = band.max.subtract(band.min).amountMinor;

  return {
    compaRatio: ratio(annualSalary.amountMinor, band.mid.amountMinor),
    rangePenetration: ratio(aboveMin, width),
    position: positionOf(annualSalary, band),
  };
}

function positionOf(salary: Money, band: PayBand): BandPosition {
  if (salary.amountMinor < band.min.amountMinor) return 'below';
  if (salary.amountMinor > band.max.amountMinor) return 'above';
  return 'within';
}

function ratio(numerator: bigint, denominator: bigint): number {
  return (
    Number(divideRoundingHalfEven(numerator * RATIO_SCALE, denominator)) /
    Number(RATIO_SCALE)
  );
}

function assertValidBand({ min, mid, max }: PayBand): void {
  const ordered =
    mid.subtract(min).amountMinor >= 0n && max.subtract(mid).amountMinor >= 0n;
  if (!ordered || max.amountMinor === min.amountMinor) {
    throw new RangeError('A pay band needs min ≤ mid ≤ max and min below max');
  }
}
