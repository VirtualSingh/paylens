import { parseAmount } from './parse-amount.js';

describe('parseAmount', () => {
  it.each([
    ['3100000', 'INR', 310000000n],
    ['31,00,000', 'INR', 310000000n],
    ['85 000.5', 'GBP', 8500050n],
    ['  1234.56 ', 'USD', 123456n],
    ['1500000', 'JPY', 1500000n],
  ])('reads "%s" %s as %s minor units', (text, currency, minor) => {
    expect(parseAmount(text, currency)?.amountMinor).toBe(minor);
  });

  it.each([
    ['', 'empty'],
    ['abc', 'not a number'],
    ['-100', 'negative'],
    ['12.345', 'more decimals than the currency has'],
    ['1.2.3', 'two decimal points'],
    ['12.', 'a point with nothing after it'],
  ])('refuses "%s" (%s)', (text) => {
    expect(parseAmount(text, 'USD')).toBeNull();
  });

  it('refuses decimals for a currency without minor units', () => {
    expect(parseAmount('100.5', 'JPY')).toBeNull();
  });
});
