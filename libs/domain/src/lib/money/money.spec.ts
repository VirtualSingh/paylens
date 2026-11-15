import { CurrencyMismatchError, Money } from './money.js';

describe('Money.add', () => {
  it('adds two amounts of the same currency in minor units', () => {
    const salary = Money.of(5_000_000n, 'EUR');
    const raise = Money.of(250_050n, 'EUR');

    const total = salary.add(raise);

    expect(total).toEqual(Money.of(5_250_050n, 'EUR'));
  });

  it('refuses to add amounts in different currencies', () => {
    const euros = Money.of(100n, 'EUR');
    const rupees = Money.of(100n, 'INR');

    const addAcrossCurrencies = () => euros.add(rupees);

    expect(addAcrossCurrencies).toThrow(CurrencyMismatchError);
  });
});

describe('Money.subtract', () => {
  it('subtracts in minor units and may go negative (a pay cut is a negative delta)', () => {
    const before = Money.of(7_000_000n, 'GBP');
    const after = Money.of(6_850_000n, 'GBP');

    const delta = after.subtract(before);

    expect(delta).toEqual(Money.of(-150_000n, 'GBP'));
  });

  it('refuses to subtract amounts in different currencies', () => {
    const pounds = Money.of(100n, 'GBP');
    const dollars = Money.of(100n, 'USD');

    expect(() => pounds.subtract(dollars)).toThrow(CurrencyMismatchError);
  });
});

describe('Money.multiplyRatio', () => {
  it('scales by an exact ratio, e.g. a 10% raise is 110/100', () => {
    const salary = Money.of(1_000_000n, 'EUR');

    const raised = salary.multiplyRatio(110n, 100n);

    expect(raised).toEqual(Money.of(1_100_000n, 'EUR'));
  });

  it('rounds the result half-even to whole minor units', () => {
    const salary = Money.of(1_000_005n, 'EUR');

    const raised = salary.multiplyRatio(110n, 100n);

    // 1_100_005.5 → the even neighbour, 1_100_006
    expect(raised).toEqual(Money.of(1_100_006n, 'EUR'));
  });
});

describe('Money.format', () => {
  it('formats minor units as a localised currency amount, without floating point', () => {
    const salary = Money.of(285_000_000n, 'INR');

    expect(salary.format('en-IN')).toBe('₹28,50,000.00');
  });

  it('respects currencies without minor units', () => {
    const salary = Money.of(5_400_000n, 'JPY');

    expect(salary.format('en-US')).toBe('¥5,400,000');
  });

  it('keeps every digit of amounts beyond floating-point precision', () => {
    const huge = Money.of(123_456_789_012_345_678n, 'USD');

    expect(huge.format('en-US')).toBe('$1,234,567,890,123,456.78');
  });
});

describe('Money.format with negative amounts', () => {
  it('shows a negative delta with its sign', () => {
    const cut = Money.of(-5n, 'USD');

    expect(cut.format('en-US')).toBe('-$0.05');
  });
});
