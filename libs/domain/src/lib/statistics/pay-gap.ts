import { divideRoundingHalfEven } from '../money/rounding.js';
import { MEDIAN, percentileCont } from './percentile.js';

/** Below this many people on either side, a gap would point at individuals (analytics.md). */
export const MIN_GROUP_SIZE = 5;

/** Gaps are reported to 4 decimals, rounded half-even, like every PayLens ratio. */
const SCALE = 10_000n;

export interface PayGap {
  /** true: one side has fewer than MIN_GROUP_SIZE people, so no figure is given. */
  readonly suppressed: boolean;
  /** (reference − group) ÷ reference on the means: 0.1 = the group earns 10% less. */
  readonly meanGap: number | null;
  readonly medianGap: number | null;
}

/**
 * The pay gap between a reference group and another, on annual amounts in one currency
 * (minor units). Exact: the mean gap is one fraction of bigints, rounded once.
 */
export function payGap(
  reference: readonly bigint[],
  group: readonly bigint[],
): PayGap {
  if (reference.length < MIN_GROUP_SIZE || group.length < MIN_GROUP_SIZE) {
    return { suppressed: true, meanGap: null, medianGap: null };
  }
  const sumReference = sum(reference);
  const sumGroup = sum(group);
  // 1 − (sumGroup / nGroup) / (sumReference / nReference), as one fraction.
  const meanGap = ratio(
    sumReference * BigInt(group.length) - sumGroup * BigInt(reference.length),
    sumReference * BigInt(group.length),
  );
  const medianReference = percentileCont(reference, MEDIAN);
  const medianGroup = percentileCont(group, MEDIAN);
  /* v8 ignore next 3 -- both sides hold at least MIN_GROUP_SIZE values here */
  if (medianReference === null || medianGroup === null) {
    return { suppressed: true, meanGap: null, medianGap: null };
  }
  return {
    suppressed: false,
    meanGap,
    medianGap: ratio(medianReference - medianGroup, medianReference),
  };
}

function sum(values: readonly bigint[]): bigint {
  return values.reduce((total, value) => total + value, 0n);
}

function ratio(numerator: bigint, denominator: bigint): number | null {
  return denominator === 0n
    ? null
    : Number(divideRoundingHalfEven(numerator * SCALE, denominator)) /
        Number(SCALE);
}
