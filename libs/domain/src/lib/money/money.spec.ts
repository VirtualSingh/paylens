import { Money } from './money.js';

describe('Money.add', () => {
  it('adds two amounts of the same currency in minor units', () => {
    const salary = Money.of(5_000_000n, 'EUR');
    const raise = Money.of(250_050n, 'EUR');

    const total = salary.add(raise);

    expect(total).toEqual(Money.of(5_250_050n, 'EUR'));
  });
});
