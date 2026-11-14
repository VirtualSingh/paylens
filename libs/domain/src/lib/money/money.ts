/** ISO-4217 currency code, e.g. "EUR", "INR", "USD". */
export type CurrencyCode = string;

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
    if (other.currency !== this.currency) {
      throw new CurrencyMismatchError(this.currency, other.currency);
    }
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }
}

/** Amounts in different currencies cannot be combined without an FX conversion. */
export class CurrencyMismatchError extends Error {
  constructor(left: CurrencyCode, right: CurrencyCode) {
    super(`Cannot combine ${left} with ${right} without converting first`);
    this.name = 'CurrencyMismatchError';
  }
}
