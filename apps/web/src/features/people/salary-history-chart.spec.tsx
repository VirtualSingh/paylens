import type { SalaryRecordJson } from '@paylens/shared';
import { mehtaHistory } from '../../testing/fixtures';
import { historyPoints, historySummary } from './salary-history-chart';

const record = (
  effectiveFrom: string,
  amountMinor: string,
  overrides: Partial<SalaryRecordJson> = {},
): SalaryRecordJson => ({
  id: `rec-${effectiveFrom}`,
  salary: { amountMinor, currency: 'INR' },
  frequency: 'annual',
  effectiveFrom,
  effectiveTo: null,
  reason: 'merit',
  note: null,
  createdAt: `${effectiveFrom}T00:00:00.000Z`,
  ...overrides,
});

describe('historyPoints', () => {
  it('runs oldest first, one point per salary, annualised', () => {
    expect(historyPoints(mehtaHistory)).toEqual([
      {
        date: '2022-04-01',
        annual: { amountMinor: '250000000', currency: 'INR' },
      },
      {
        date: '2024-04-01',
        annual: { amountMinor: '285000000', currency: 'INR' },
      },
    ]);
  });

  it('turns a monthly salary into its yearly amount', () => {
    expect(
      historyPoints([
        record('2024-04-01', '15000000', { frequency: 'monthly' }),
      ]),
    ).toEqual([
      {
        date: '2024-04-01',
        annual: { amountMinor: '180000000', currency: 'INR' },
      },
    ]);
  });

  it('leaves out a record a correction superseded (closed on its own first day)', () => {
    expect(
      historyPoints([
        record('2024-04-01', '290000000', { reason: 'correction' }),
        record('2024-04-01', '285000000', { effectiveTo: '2024-04-01' }),
      ]).map((point) => point.annual.amountMinor),
    ).toEqual(['290000000']);
  });
});

describe('historySummary', () => {
  it('says where pay started and where it is now, for screen readers', () => {
    expect(historySummary(mehtaHistory)).toBe(
      'Annual salary from ₹25,00,000 on 1 Apr 2022 to ₹28,50,000 on 1 Apr 2024, over 2 salaries.',
    );
  });

  it('says so when there has been only one salary', () => {
    expect(historySummary([record('2024-04-01', '285000000')])).toBe(
      'Annual salary ₹28,50,000 since 1 Apr 2024.',
    );
  });
});
