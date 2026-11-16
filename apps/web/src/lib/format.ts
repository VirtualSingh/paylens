import { annualize, Money } from '@paylens/domain';
import type { MoneyJson, PayFrequencyName } from '@paylens/shared';

const DATE = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const DATE_TIME = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
  timeZoneName: 'short',
});

/** "2019-03-12" → "12 Mar 2019". Effective dates are UTC dates (CLAUDE.md), shown as such. */
export function formatDate(isoDate: string): string {
  return DATE.format(new Date(`${isoDate.slice(0, 10)}T00:00:00Z`));
}

/** An audit timestamp, with its zone so nobody misreads the hour. */
export function formatDateTime(isoTimestamp: string): string {
  return DATE_TIME.format(new Date(isoTimestamp));
}

export const PER_PERIOD: Record<PayFrequencyName, string> = {
  annual: 'year',
  monthly: 'month',
};

/**
 * Percentage change between two salaries, compared annualised with the domain's rules so a
 * monthly and an annual salary compare fairly. "+14.0%". For display only.
 */
export function salaryChange(
  from: { salary: MoneyJson; frequency: PayFrequencyName },
  to: { salary: MoneyJson; frequency: PayFrequencyName },
): string | null {
  const ratio = salaryChangeRatio(from, to);
  if (ratio === null) {
    return null;
  }
  const percent = ratio * 100;
  return `${percent >= 0 ? '+' : ''}${percent.toFixed(1)}%`;
}

/** The same change as a fraction (0.14 = 14% more); null across currencies or from zero. */
export function salaryChangeRatio(
  from: { salary: MoneyJson; frequency: PayFrequencyName },
  to: { salary: MoneyJson; frequency: PayFrequencyName },
): number | null {
  if (from.salary.currency !== to.salary.currency) {
    return null;
  }
  const before = annualYearly(from).amountMinor;
  const after = annualYearly(to).amountMinor;
  return before === 0n ? null : Number(after - before) / Number(before);
}

function annualYearly(value: {
  salary: MoneyJson;
  frequency: PayFrequencyName;
}): Money {
  return annualize(
    Money.of(BigInt(value.salary.amountMinor), value.salary.currency),
    value.frequency,
  );
}
