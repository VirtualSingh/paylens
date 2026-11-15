import { Money } from '../money/money.js';
import { annualize } from './pay-frequency.js';

describe('annualize', () => {
  it('keeps an annual amount as it is', () => {
    const annual = Money.of(9_500_000n, 'USD');

    expect(annualize(annual, 'annual')).toEqual(annual);
  });

  it('multiplies a monthly amount by twelve', () => {
    const monthly = Money.of(23_750_000n, 'INR');

    expect(annualize(monthly, 'monthly')).toEqual(
      Money.of(285_000_000n, 'INR'),
    );
  });
});
