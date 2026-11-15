import { FxTable } from '@paylens/domain';
import type { DirectoryRow } from './employees.repository.js';
import { toDirectoryItem } from './directory-item.mapper.js';

const fx = new FxTable([
  { quote: 'INR', rate: '83', asOf: '2026-11-01' },
  { quote: 'GBP', rate: '0.80', asOf: '2026-11-01' },
]);
const usd = {
  fx,
  reportingCurrency: 'USD',
  today: '2026-11-14',
  showPay: true,
};

// Aarav Mehta in the mini-ACME table: ₹28,50,000 a year in the IC4 India band.
function aDirectoryRow(overrides: Partial<DirectoryRow> = {}): DirectoryRow {
  return {
    id: '00000000-0000-4000-8000-000000000001',
    employeeCode: 'ACME-000001',
    firstName: 'Aarav',
    lastName: 'Mehta',
    workEmail: 'aarav.mehta@acme.test',
    countryCode: 'IN',
    departmentCode: 'ENG',
    departmentName: 'Engineering',
    levelCode: 'IC4',
    jobTitle: 'Software Engineer',
    status: 'active',
    hireDate: '2019-03-12',
    salary: { amountMinor: 285_000_000n, currency: 'INR', frequency: 'annual' },
    band: {
      minMinor: 240_000_000n,
      midMinor: 300_000_000n,
      maxMinor: 360_000_000n,
      currency: 'INR',
    },
    ...overrides,
  };
}

describe('toDirectoryItem', () => {
  it('shows pay in local and reporting currency with the band metrics', () => {
    const item = toDirectoryItem(aDirectoryRow(), usd);

    expect(item.pay).toEqual({
      salary: { amountMinor: '285000000', currency: 'INR' },
      frequency: 'annual',
      annualLocal: { amountMinor: '285000000', currency: 'INR' },
      // ₹28,50,000 ÷ 83 = $34,337.349… → $34,337.35
      annualReporting: {
        money: { amountMinor: '3433735', currency: 'USD' },
        asOf: '2026-11-01',
      },
      band: {
        min: { amountMinor: '240000000', currency: 'INR' },
        mid: { amountMinor: '300000000', currency: 'INR' },
        max: { amountMinor: '360000000', currency: 'INR' },
      },
      compaRatio: 0.95,
      rangePenetration: 0.375,
      bandPosition: 'within',
    });
  });

  it('annualises a monthly salary before comparing it with the band', () => {
    const item = toDirectoryItem(
      aDirectoryRow({
        salary: {
          amountMinor: 15_000_000n,
          currency: 'INR',
          frequency: 'monthly',
        },
        band: {
          minMinor: 160_000_000n,
          midMinor: 200_000_000n,
          maxMinor: 240_000_000n,
          currency: 'INR',
        },
      }),
      usd,
    );

    expect(item.pay).toMatchObject({
      annualLocal: { amountMinor: '180000000', currency: 'INR' },
      compaRatio: 0.9,
      rangePenetration: 0.25,
    });
  });

  it('leaves pay out entirely for a reader who may not see it', () => {
    const item = toDirectoryItem(aDirectoryRow(), { ...usd, showPay: false });

    expect(item).not.toHaveProperty('pay');
  });

  it('reports no pay for someone without a current salary', () => {
    const item = toDirectoryItem(aDirectoryRow({ salary: null }), usd);

    expect(item.pay).toBeNull();
  });

  it('leaves band metrics empty when there is no band for the level and country', () => {
    const item = toDirectoryItem(aDirectoryRow({ band: null }), usd);

    expect(item.pay).toMatchObject({
      band: null,
      compaRatio: null,
      rangePenetration: null,
      bandPosition: null,
    });
  });

  it('says the reporting amount is unavailable when no rate is known', () => {
    const item = toDirectoryItem(aDirectoryRow(), {
      ...usd,
      reportingCurrency: 'BRL',
    });

    expect(item.pay?.annualReporting).toBeNull();
  });

  it('carries the identity and placement fields through', () => {
    const item = toDirectoryItem(aDirectoryRow(), usd);

    expect(item).toMatchObject({
      employeeCode: 'ACME-000001',
      department: { code: 'ENG', name: 'Engineering' },
      levelCode: 'IC4',
      status: 'active',
      hireDate: '2019-03-12',
    });
  });
});
