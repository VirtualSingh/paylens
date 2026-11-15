import { Money } from '../money/money.js';
import { FxTable } from './fx-table.js';

// "1 USD = rate × quote currency", as stored in fx_rates (data-model.md).
const rates = new FxTable([
  { quote: 'INR', rate: '81.00000000', asOf: '2025-11-01' },
  { quote: 'INR', rate: '83.00000000', asOf: '2026-11-01' },
  { quote: 'EUR', rate: '0.92', asOf: '2026-11-01' },
  { quote: 'GBP', rate: '0.78', asOf: '2026-11-01' },
  { quote: 'JPY', rate: '150.5', asOf: '2026-11-01' },
]);

describe('FxTable.convert', () => {
  it('returns the same amount when no conversion is needed', () => {
    const result = rates.convert(Money.of(10_000n, 'EUR'), 'EUR', '2026-11-14');

    expect(result).toEqual({
      kind: 'converted',
      money: Money.of(10_000n, 'EUR'),
      asOf: '2026-11-14',
    });
  });

  it('converts from USD with the quote rate: $100.00 → ₹8,300.00', () => {
    const result = rates.convert(Money.of(10_000n, 'USD'), 'INR', '2026-11-14');

    expect(result).toEqual({
      kind: 'converted',
      money: Money.of(830_000n, 'INR'),
      asOf: '2026-11-01',
    });
  });

  it('converts into USD by dividing by the rate: ₹8,300.00 → $100.00', () => {
    const result = rates.convert(
      Money.of(830_000n, 'INR'),
      'USD',
      '2026-11-14',
    );

    expect(result).toMatchObject({ money: Money.of(10_000n, 'USD') });
  });

  it('derives cross rates through USD: €100.00 × 0.78 / 0.92 = £84.78', () => {
    // 84.7826… rounds to 84.78
    const result = rates.convert(Money.of(10_000n, 'EUR'), 'GBP', '2026-11-14');

    expect(result).toMatchObject({ money: Money.of(8_478n, 'GBP') });
  });

  it('rounds half-even into a currency with no minor units: $1.00 × 150.5 = ¥150', () => {
    const result = rates.convert(Money.of(100n, 'USD'), 'JPY', '2026-11-14');

    expect(result).toMatchObject({ money: Money.of(150n, 'JPY') });
  });

  it('uses the latest rate on or before the as-of date', () => {
    // On 2026-06-30 the 2026-11-01 rate is not known yet: 81, not 83.
    const result = rates.convert(Money.of(10_000n, 'USD'), 'INR', '2026-06-30');

    expect(result).toEqual({
      kind: 'converted',
      money: Money.of(810_000n, 'INR'),
      asOf: '2025-11-01',
    });
  });

  it('labels a cross conversion with the older of the two rate dates', () => {
    const result = rates.convert(
      Money.of(810_000n, 'INR'),
      'EUR',
      '2026-11-14',
    );

    expect(result).toMatchObject({ asOf: '2026-11-01' });
  });

  it('reports the rate as unavailable instead of guessing', () => {
    // No INR rate is known on or before 2025-01-01.
    const result = rates.convert(
      Money.of(810_000n, 'INR'),
      'USD',
      '2025-01-01',
    );

    expect(result).toEqual({
      kind: 'unavailable',
      currency: 'INR',
      asOf: '2025-01-01',
    });
  });

  it('reports the target currency when only it lacks a rate', () => {
    const result = rates.convert(Money.of(10_000n, 'USD'), 'CAD', '2026-11-14');

    expect(result).toEqual({
      kind: 'unavailable',
      currency: 'CAD',
      asOf: '2026-11-14',
    });
  });

  it('finds the latest rate whatever order the rates were loaded in', () => {
    const newestFirst = new FxTable([
      { quote: 'INR', rate: '83', asOf: '2026-11-01' },
      { quote: 'INR', rate: '81', asOf: '2025-11-01' },
    ]);

    const result = newestFirst.convert(
      Money.of(100n, 'USD'),
      'INR',
      '2026-11-14',
    );

    expect(result).toMatchObject({ money: Money.of(8_300n, 'INR') });
  });

  it('refuses a rate that is not a positive decimal', () => {
    expect(
      () => new FxTable([{ quote: 'INR', rate: '-83', asOf: '2026-11-01' }]),
    ).toThrow(RangeError);
  });
});
