import { Money, minorUnitsOf } from '@paylens/domain';
import type { MoneyJson } from '@paylens/shared';

/** Digit grouping follows the currency's home convention where it differs (₹28,50,000). */
const LOCALE_BY_CURRENCY: Readonly<Record<string, string>> = { INR: 'en-IN' };
const DEFAULT_LOCALE = 'en-US';

/**
 * Money for people to read (ui.md → MoneyText). Works on the decimal string, never a float:
 * Intl formats "2850000.00" exactly. Whole amounts drop their ".00" (salaries are usually
 * whole); `whole` rounds to whole units, for approximate converted figures.
 */
export function formatMoney(
  money: MoneyJson,
  options: { readonly whole?: boolean } = {},
): string {
  const minorUnits = minorUnitsOf(money.currency);
  const decimal = Money.of(
    BigInt(money.amountMinor),
    money.currency,
  ).toDecimalString();
  const [, fraction = ''] = decimal.split('.');
  const fractionDigits =
    options.whole === true || /^0*$/.test(fraction) ? 0 : minorUnits;
  return new Intl.NumberFormat(
    LOCALE_BY_CURRENCY[money.currency] ?? DEFAULT_LOCALE,
    {
      style: 'currency',
      currency: money.currency,
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    },
  ).format(decimal);
}

/**
 * A money figure with tabular numerals. Converted figures carry "≈" and say in their tooltip
 * which rate they used (ui.md → Currency).
 */
export function MoneyText({
  money,
  approximate,
  className = '',
}: {
  money: MoneyJson;
  /** Set for a converted figure: the date of the FX rate used. */
  approximate?: { readonly asOf: string };
  className?: string;
}) {
  if (approximate === undefined) {
    return (
      <span className={`tabular-nums ${className}`}>{formatMoney(money)}</span>
    );
  }
  return (
    <span
      className={`tabular-nums ${className}`}
      title={`Converted at the ${money.currency} rate as of ${approximate.asOf}`}
    >
      ≈ {formatMoney(money, { whole: true })}
    </span>
  );
}
