import { FxRatesQuerySchema, PayBandsQuerySchema } from './reference.schema.js';

describe('PayBandsQuerySchema', () => {
  it('accepts a country, a level and a date', () => {
    expect(
      PayBandsQuerySchema.parse({
        country: 'IN',
        level: 'IC4',
        asOf: '2026-01-01',
      }),
    ).toEqual({ country: 'IN', level: 'IC4', asOf: '2026-01-01' });
  });

  it.each([
    ['a lower-case country', { country: 'in' }],
    ['a level outside IC1–IC6 and M1–M4', { level: 'IC9' }],
    ['a date that is not YYYY-MM-DD', { asOf: '01/01/2026' }],
  ])('rejects %s', (_case, query) => {
    expect(PayBandsQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('FxRatesQuerySchema', () => {
  it('accepts a currency and a date range', () => {
    expect(
      FxRatesQuerySchema.parse({
        quote: 'INR',
        from: '2025-01-01',
        to: '2026-12-31',
      }),
    ).toEqual({ quote: 'INR', from: '2025-01-01', to: '2026-12-31' });
  });

  it('rejects a range that ends before it starts, pointing at "to"', () => {
    const result = FxRatesQuerySchema.safeParse({
      from: '2026-12-31',
      to: '2025-01-01',
    });

    expect(result.error?.issues[0]?.path).toEqual(['to']);
  });

  it('rejects a currency that is not three capital letters', () => {
    expect(FxRatesQuerySchema.safeParse({ quote: 'inr' }).success).toBe(false);
  });
});
