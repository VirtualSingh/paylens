import { CurrencyMismatchError, Money } from '../money/money.js';
import { bandMetrics, type PayBand } from './band-metrics.js';

const lakh = (rupees: number) =>
  Money.of(BigInt(rupees * 100_000 * 100), 'INR');

// IC4 · India: ₹24,00,000 – ₹30,00,000 – ₹36,00,000 (annual)
const band: PayBand = { min: lakh(24), mid: lakh(30), max: lakh(36) };

describe('bandMetrics', () => {
  it('places a salary inside the band: compa-ratio 0.95, penetration 0.375', () => {
    // 28.5 / 30 = 0.95 ; (28.5 − 24) / (36 − 24) = 0.375
    const metrics = bandMetrics(lakh(28.5), band);

    expect(metrics).toEqual({
      compaRatio: 0.95,
      rangePenetration: 0.375,
      position: 'within',
    });
  });

  it('counts the minimum itself as within the band', () => {
    expect(bandMetrics(lakh(24), band)).toMatchObject({
      position: 'within',
      rangePenetration: 0,
    });
  });

  it('counts the maximum itself as within the band', () => {
    expect(bandMetrics(lakh(36), band)).toMatchObject({
      position: 'within',
      rangePenetration: 1,
    });
  });

  it('marks a salary under the minimum as below, with negative penetration', () => {
    // 20 / 30 = 0.6667 ; (20 − 24) / 12 = −0.3333
    expect(bandMetrics(lakh(20), band)).toEqual({
      compaRatio: 0.6667,
      rangePenetration: -0.3333,
      position: 'below',
    });
  });

  it('marks a salary over the maximum as above', () => {
    // 40 / 30 = 1.3333 ; (40 − 24) / 12 = 1.3333
    expect(bandMetrics(lakh(40), band)).toEqual({
      compaRatio: 1.3333,
      rangePenetration: 1.3333,
      position: 'above',
    });
  });

  it('refuses a salary and a band in different currencies', () => {
    const dollars = Money.of(10_000_000n, 'USD');

    expect(() => bandMetrics(dollars, band)).toThrow(CurrencyMismatchError);
  });

  it.each([
    ['min above mid', { min: lakh(31), mid: lakh(30), max: lakh(36) }],
    ['mid above max', { min: lakh(24), mid: lakh(37), max: lakh(36) }],
    ['no width', { min: lakh(30), mid: lakh(30), max: lakh(30) }],
  ])('refuses an invalid band (%s)', (_case, invalid) => {
    expect(() => bandMetrics(lakh(30), invalid)).toThrow(RangeError);
  });
});
