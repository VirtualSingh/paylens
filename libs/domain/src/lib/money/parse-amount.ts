import { type CurrencyCode, Money, minorUnitsOf } from './money.js';

const DIGITS = /^\d+$/;
/** Separators people type between groups of digits: "31,00,000", "85 000", "1_000". */
const GROUPING = /[,\s_]/g;

/**
 * An amount as a person types it, in major units ("31,00,000" rupees), as exact minor units —
 * or null when it is not a plain non-negative amount with at most the currency's decimals.
 * String arithmetic only: no float ever holds the value.
 */
export function parseAmount(
  text: string,
  currency: CurrencyCode,
): Money | null {
  const [whole = '', fraction, extra] = text.replace(GROUPING, '').split('.');
  const minorUnits = minorUnitsOf(currency);
  if (
    extra !== undefined ||
    !DIGITS.test(whole) ||
    (fraction !== undefined &&
      (!DIGITS.test(fraction) || fraction.length > minorUnits))
  ) {
    return null;
  }
  const minor = `${whole}${(fraction ?? '').padEnd(minorUnits, '0')}`;
  return Money.of(BigInt(minor), currency);
}
