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
    return new Money(this.amountMinor + other.amountMinor, this.currency);
  }
}
