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
