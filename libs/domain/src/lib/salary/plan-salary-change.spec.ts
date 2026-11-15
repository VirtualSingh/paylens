import { aSalaryRecord } from '../../testing/builders.js';
import { DomainError } from '../errors.js';
import { Money } from '../money/money.js';
import { planSalaryChange } from './plan-salary-change.js';

const inr = (rupees: number) => Money.of(BigInt(rupees) * 100n, 'INR');
const india = { countryCurrency: 'INR' };

describe('planSalaryChange', () => {
  it('records the first salary of a new hire as the open record', () => {
    const plan = planSalaryChange(
      [],
      {
        effectiveFrom: '2019-03-12',
        amount: inr(1_800_000),
        frequency: 'annual',
        reason: 'hire',
      },
      india,
    );

    expect(plan).toEqual({
      close: [],
      insert: {
        effectiveFrom: '2019-03-12',
        effectiveTo: null,
        amount: inr(1_800_000),
        frequency: 'annual',
        reason: 'hire',
        note: null,
      },
    });
  });

  it('closes the current record on the day the new salary starts', () => {
    const history = [
      aSalaryRecord({
        id: 'salary-2',
        effectiveFrom: '2023-04-01',
        effectiveTo: '2025-04-01',
        amount: inr(2_500_000),
      }),
      aSalaryRecord({
        id: 'salary-3',
        effectiveFrom: '2025-04-01',
        effectiveTo: null,
        amount: inr(2_850_000),
      }),
    ];

    const plan = planSalaryChange(
      history,
      {
        effectiveFrom: '2027-01-01',
        amount: inr(3_100_000),
        frequency: 'annual',
        reason: 'promotion',
        note: 'Promotion to Senior Engineer approved in Q4 calibration',
      },
      india,
    );

    expect(plan).toEqual({
      close: [{ recordId: 'salary-3', effectiveTo: '2027-01-01' }],
      insert: {
        effectiveFrom: '2027-01-01',
        effectiveTo: null,
        amount: inr(3_100_000),
        frequency: 'annual',
        reason: 'promotion',
        note: 'Promotion to Senior Engineer approved in Q4 calibration',
      },
    });
  });
});

describe('planSalaryChange rules', () => {
  const current = aSalaryRecord({
    id: 'salary-3',
    effectiveFrom: '2025-04-01',
    effectiveTo: null,
    amount: inr(2_850_000),
  });
  const change = {
    effectiveFrom: '2027-01-01',
    amount: inr(3_100_000),
    frequency: 'annual',
    reason: 'merit',
  } as const;

  it.each(['2025-04-01', '2024-12-31'])(
    'refuses a new salary starting %s, not after the current one (2025-04-01)',
    (effectiveFrom) => {
      const plan = () =>
        planSalaryChange([current], { ...change, effectiveFrom }, india);

      expect(plan).toThrow(
        expect.objectContaining({
          code: 'effective_date_not_after_current',
          message:
            'Effective date must be after 2025-04-01, when the current salary started',
        }),
      );
    },
  );

  it.each([0, -1])('refuses a salary of %d', (rupees) => {
    const plan = () =>
      planSalaryChange([current], { ...change, amount: inr(rupees) }, india);

    expect(plan).toThrow(
      expect.objectContaining({ code: 'salary_not_positive' }),
    );
  });

  it("refuses an amount that is not in the country's currency", () => {
    const dollars = Money.of(3_700_000n, 'USD');

    const plan = () =>
      planSalaryChange([current], { ...change, amount: dollars }, india);

    expect(plan).toThrow(
      expect.objectContaining({ code: 'salary_currency_not_country_currency' }),
    );
  });

  it('reports rule violations as domain errors', () => {
    const plan = () =>
      planSalaryChange([current], { ...change, amount: inr(0) }, india);

    expect(plan).toThrow(DomainError);
  });
});
