import { render, screen } from '@testing-library/react';
import { formatMoney, MoneyText } from './money';

const money = (amountMinor: string, currency: string) => ({
  amountMinor,
  currency,
});

describe('formatMoney', () => {
  it.each([
    [
      'a whole rupee salary, grouped the Indian way',
      money('285000000', 'INR'),
      '₹28,50,000',
    ],
    ['dollars with cents', money('1234567', 'USD'), '$12,345.67'],
    ['a whole pound salary', money('8500000', 'GBP'), '£85,000'],
    ['a currency without minor units', money('1500000', 'JPY'), '¥1,500,000'],
  ])('writes %s', (_case, value, expected) => {
    expect(formatMoney(value)).toBe(expected);
  });

  it('rounds an approximate figure to whole units', () => {
    expect(formatMoney(money('3433735', 'USD'), { whole: true })).toBe(
      '$34,337',
    );
  });
});

describe('MoneyText', () => {
  it('marks a converted figure as approximate and says when its rate is from', () => {
    render(
      <MoneyText
        money={money('3433735', 'USD')}
        approximate={{ asOf: '2026-11-01' }}
      />,
    );

    const figure = screen.getByText('≈ $34,337');
    expect(figure).toHaveAttribute(
      'title',
      'Converted at the USD rate as of 2026-11-01',
    );
  });
});
