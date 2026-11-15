import { SalaryChangeRequestSchema } from './salary.schema.js';

describe('SalaryChangeRequestSchema', () => {
  const valid = {
    effectiveFrom: '2027-01-01',
    amount: { amountMinor: '310000000', currency: 'INR' },
    frequency: 'annual',
    reason: 'promotion',
    note: '  Promotion to Senior Engineer  ',
  };

  it('accepts a change and trims the note', () => {
    expect(SalaryChangeRequestSchema.parse(valid).note).toBe(
      'Promotion to Senior Engineer',
    );
  });

  it.each([
    ['a date that is not YYYY-MM-DD', { effectiveFrom: '01/01/2027' }],
    ['"hire", which only person creation may use', { reason: 'hire' }],
    ['an unknown reason', { reason: 'bonus' }],
    ['a note longer than 500 characters', { note: 'x'.repeat(501) }],
  ])('rejects %s', (_case, change) => {
    expect(
      SalaryChangeRequestSchema.safeParse({ ...valid, ...change }).success,
    ).toBe(false);
  });
});
