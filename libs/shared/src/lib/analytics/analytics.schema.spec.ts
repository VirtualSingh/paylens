import {
  AnalyticsBreakdownQuerySchema,
  AnalyticsQuerySchema,
} from './analytics.schema.js';

describe('AnalyticsQuerySchema', () => {
  it('reports in USD as of today unless asked otherwise', () => {
    expect(AnalyticsQuerySchema.parse({})).toEqual({
      reportingCurrency: 'USD',
    });
  });

  it('accepts a reporting currency and a past date', () => {
    expect(
      AnalyticsQuerySchema.parse({
        reportingCurrency: 'INR',
        asOf: '2025-12-31',
      }),
    ).toEqual({ reportingCurrency: 'INR', asOf: '2025-12-31' });
  });

  it.each([
    ['a lower-case currency', { reportingCurrency: 'inr' }],
    ['a date that is not YYYY-MM-DD', { asOf: '31/12/2025' }],
  ])('rejects %s', (_case, query) => {
    expect(AnalyticsQuerySchema.safeParse(query).success).toBe(false);
  });
});

describe('AnalyticsBreakdownQuerySchema', () => {
  it('groups only by country, department or level', () => {
    expect(
      AnalyticsBreakdownQuerySchema.safeParse({ by: 'country' }).success,
    ).toBe(true);
    expect(
      AnalyticsBreakdownQuerySchema.safeParse({ by: 'gender' }).success,
    ).toBe(false);
  });
});
