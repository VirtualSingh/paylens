import { MoneyJsonSchema } from './money-json.schema.js';

describe('MoneyJsonSchema', () => {
  it('accepts whole minor units as a string, with the currency', () => {
    const money = { amountMinor: '7850000', currency: 'EUR' };

    expect(MoneyJsonSchema.parse(money)).toEqual(money);
  });

  it.each([
    ['a decimal amount', { amountMinor: '78500.00', currency: 'EUR' }],
    ['a number instead of a string', { amountMinor: 7850000, currency: 'EUR' }],
    ['a lower-case currency', { amountMinor: '7850000', currency: 'eur' }],
  ])('rejects %s', (_case, money) => {
    expect(MoneyJsonSchema.safeParse(money).success).toBe(false);
  });
});
