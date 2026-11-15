import { type CurrencyCode, minorUnitsOf, Money } from '../money/money.js';
import { divideRoundingHalfEven } from '../money/rounding.js';
import type { IsoDate } from '../time/iso-date.js';

/** One row of `fx_rates`: on `asOf`, 1 USD = `rate` units of `quote`. */
export interface FxRate {
  readonly quote: CurrencyCode;
  /** Decimal string as stored in numeric(18,8), e.g. "83.12345678". */
  readonly rate: string;
  readonly asOf: IsoDate;
}

export type Conversion =
  | {
      readonly kind: 'converted';
      readonly money: Money;
      /** Date of the (oldest) rate used; the requested date when no rate was needed. */
      readonly asOf: IsoDate;
    }
  | {
      readonly kind: 'unavailable';
      /** The currency with no rate on or before the requested date. */
      readonly currency: CurrencyCode;
      readonly asOf: IsoDate;
    };

/** A decimal as an exact integer and a power of ten: "83.12" → 8312 / 10^2. */
interface Decimal {
  readonly coefficient: bigint;
  readonly scale: number;
}

interface UsdRate extends Decimal {
  /** null for USD itself, which needs no rate. */
  readonly asOf: IsoDate | null;
}

const USD = 'USD';
const POSITIVE_DECIMAL = /^\d+(\.\d+)?$/;

/**
 * Dated USD-based exchange rates (ADR-004). Conversions are exact rational arithmetic on
 * integers with a single half-even rounding at the end, so there is no float and no
 * precision limit.
 */
export class FxTable {
  private readonly rates: readonly (FxRate & Decimal)[];

  constructor(rates: readonly FxRate[]) {
    this.rates = rates.map((rate) => ({ ...rate, ...parseRate(rate.rate) }));
  }

  convert(money: Money, to: CurrencyCode, asOf: IsoDate): Conversion {
    if (money.currency === to) {
      return { kind: 'converted', money, asOf };
    }
    const from = this.usdRate(money.currency, asOf);
    if (from === undefined) {
      return { kind: 'unavailable', currency: money.currency, asOf };
    }
    const target = this.usdRate(to, asOf);
    if (target === undefined) {
      return { kind: 'unavailable', currency: to, asOf };
    }

    // amount_to = amount_from / 10^digits_from × (rate_to / rate_from) × 10^digits_to
    const numerator =
      money.amountMinor *
      target.coefficient *
      10n ** BigInt(from.scale + minorUnitsOf(to));
    const denominator =
      from.coefficient *
      10n ** BigInt(target.scale + minorUnitsOf(money.currency));

    // Label the result with the oldest rate it relied on (never later than the request).
    const ratesAsOf = [from.asOf, target.asOf].reduce<IsoDate>(
      (older, date) => (date !== null && date < older ? date : older),
      asOf,
    );
    return {
      kind: 'converted',
      money: Money.of(divideRoundingHalfEven(numerator, denominator), to),
      asOf: ratesAsOf,
    };
  }

  /** The latest rate for `currency` dated on or before `asOf`. */
  private usdRate(currency: CurrencyCode, asOf: IsoDate): UsdRate | undefined {
    if (currency === USD) {
      return { coefficient: 1n, scale: 0, asOf: null };
    }
    return this.rates
      .filter((rate) => rate.quote === currency && rate.asOf <= asOf)
      .reduce<(FxRate & Decimal) | undefined>(
        (latest, rate) => (latest && latest.asOf >= rate.asOf ? latest : rate),
        undefined,
      );
  }
}

function parseRate(rate: string): Decimal {
  if (!POSITIVE_DECIMAL.test(rate) || /^[0.]+$/.test(rate)) {
    throw new RangeError(
      `An FX rate must be a positive decimal, got "${rate}"`,
    );
  }
  const [whole = '', fraction = ''] = rate.split('.');
  return { coefficient: BigInt(whole + fraction), scale: fraction.length };
}
