import { Money } from '../money/money.js';

/** How a salary amount is expressed. Hourly pay is out of scope (ADR-004). */
export type PayFrequency = 'annual' | 'monthly';

const PERIODS_PER_YEAR: Readonly<Record<PayFrequency, bigint>> = {
  annual: 1n,
  monthly: 12n,
};

/** The yearly equivalent of an amount, so salaries paid differently can be compared. */
export function annualize(amount: Money, frequency: PayFrequency): Money {
  return amount.multiplyRatio(PERIODS_PER_YEAR[frequency], 1n);
}
