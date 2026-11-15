import { divideRoundingHalfEven } from './rounding.js';

/** ISO-4217 currency code, e.g. "EUR", "INR", "USD". */
export type CurrencyCode = string;

/** Digits after the decimal point for a currency (INR 2, JPY 0), from the ISO 4217 data in Intl. */
export function minorUnitsOf(currency: CurrencyCode): number {
  const { maximumFractionDigits } = new Intl.NumberFormat('en', {
    style: 'currency',
    currency,
  }).resolvedOptions();
  /* v8 ignore next 3 -- unreachable: Intl always resolves fraction digits for style "currency" */
  if (maximumFractionDigits === undefined) {
    throw new RangeError(`No minor units known for ${currency}`);
  }
  return maximumFractionDigits;
}

/** 285000000n with 2 digits → "2850000.00"; −5n with 2 digits → "-0.05". */
function toDecimalString(amountMinor: bigint, digits: number): `${number}` {
  const negative = amountMinor < 0n;
  const absolute = (negative ? -amountMinor : amountMinor)
    .toString()
    .padStart(digits + 1, '0');
  const whole = absolute.slice(0, absolute.length - digits);
  const fraction = absolute.slice(absolute.length - digits);
  const sign = negative ? '-' : '';
  return (
    digits === 0 ? `${sign}${whole}` : `${sign}${whole}.${fraction}`
  ) as `${number}`;
}

/**
 * An exact amount of money: an integer number of minor units (cents, paise …) in one
 * currency. Never a float — see ADR-004.
 */
export class Money {
  private constructor(
    readonly amountMinor: bigint,
    readonly currency: CurrencyCode,
  ) {}

  static of(amountMinor: bigint, currency: CurrencyCode): Money {
    return new Money(amountMinor, currency);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amountMinor - other.amountMinor, this.currency);
  }

  /** This amount × numerator / denominator, rounded half-even to whole minor units. */
  multiplyRatio(numerator: bigint, denominator: bigint): Money {
    return new Money(
      divideRoundingHalfEven(this.amountMinor * numerator, denominator),
      this.currency,
    );
  }

  /**
   * Localised display, e.g. "₹28,50,000.00". The amount reaches Intl as an exact decimal
   * string, so no digit is lost to floating point.
   */
  format(locale: string): string {
    const formatter = new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    });
    return formatter.format(
      toDecimalString(this.amountMinor, minorUnitsOf(this.currency)),
    );
  }

  private assertSameCurrency(other: Money): void {
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
  }
}

/** Amounts in different currencies cannot be combined without an FX conversion. */
export class CurrencyMismatchError extends Error {
  constructor(left: CurrencyCode, right: CurrencyCode) {
    super(`Cannot combine ${left} with ${right} without converting first`);
    this.name = 'CurrencyMismatchError';
  }
}
