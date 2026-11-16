import type {
  Country,
  Department,
  EmployeeDirectoryPage,
  EmployeeProfile,
  JobFamily,
  JobLevel,
  SalaryRecordJson,
} from '@paylens/shared';
import { http, HttpResponse } from 'msw';

// A small, hand-checkable slice of Mini-ACME (apps/api/src/db/testing/mini-acme.ts).

export const countries: Country[] = [
  { code: 'IN', name: 'India', currencyCode: 'INR', region: 'APAC' },
  { code: 'GB', name: 'United Kingdom', currencyCode: 'GBP', region: 'EMEA' },
  {
    code: 'US',
    name: 'United States',
    currencyCode: 'USD',
    region: 'Americas',
  },
];
export const departments: Department[] = [
  { code: 'ENG', name: 'Engineering' },
  { code: 'SAL', name: 'Sales' },
];
export const jobFamilies: JobFamily[] = [
  { code: 'GTM', name: 'Go-to-market' },
  { code: 'SWE', name: 'Software' },
];
export const jobLevels: JobLevel[] = [
  { code: 'IC3', track: 'ic', rank: 3 },
  { code: 'IC4', track: 'ic', rank: 4 },
  { code: 'M1', track: 'manager', rank: 4 },
];

const inr = (rupees: number) => ({
  amountMinor: String(rupees * 100),
  currency: 'INR',
});
/** Integer cents: converted figures are rarely whole dollars, and floats would drift. */
const usdCents = (cents: number) => ({
  amountMinor: String(cents),
  currency: 'USD',
});

export const MEHTA_ID = '7f1d2c3e-4b5a-4c6d-8e9f-0a1b2c3d4e5f';
export const GUPTA_ID = '2a1b3c4d-5e6f-4a7b-8c9d-0e1f2a3b4c5d';

/** Aarav Mehta: IN · IC4 · ₹28,50,000 a year · band ₹24L/30L/36L · compa 0.95. */
export const mehtaListItem: EmployeeDirectoryPage['data'][number] = {
  id: MEHTA_ID,
  employeeCode: 'ACME-000001',
  firstName: 'Aarav',
  lastName: 'Mehta',
  workEmail: 'aarav.mehta@acme.test',
  countryCode: 'IN',
  department: { code: 'ENG', name: 'Engineering' },
  levelCode: 'IC4',
  jobTitle: 'Software Engineer',
  status: 'active',
  hireDate: '2019-03-12',
  pay: {
    salary: inr(2_850_000),
    frequency: 'annual',
    annualLocal: inr(2_850_000),
    annualReporting: { money: usdCents(3_433_735), asOf: '2026-11-01' },
    band: { min: inr(2_400_000), mid: inr(3_000_000), max: inr(3_600_000) },
    compaRatio: 0.95,
    rangePenetration: 0.375,
    bandPosition: 'within',
  },
};

/** Rohan Gupta: IN · IC4 · ₹22,00,000 · below band. */
export const guptaListItem: EmployeeDirectoryPage['data'][number] = {
  ...mehtaListItem,
  id: GUPTA_ID,
  employeeCode: 'ACME-000003',
  firstName: 'Rohan',
  lastName: 'Gupta',
  workEmail: 'rohan.gupta@acme.test',
  department: { code: 'SAL', name: 'Sales' },
  jobTitle: 'Account Executive',
  pay: {
    salary: inr(2_200_000),
    frequency: 'annual',
    annualLocal: inr(2_200_000),
    annualReporting: { money: usdCents(2_650_602), asOf: '2026-11-01' },
    band: { min: inr(2_400_000), mid: inr(3_000_000), max: inr(3_600_000) },
    compaRatio: 0.7333,
    rangePenetration: -0.1667,
    bandPosition: 'below',
  },
};

export const directoryPage = (
  data = [guptaListItem, mehtaListItem],
): EmployeeDirectoryPage => ({
  data,
  page: 1,
  pageSize: 50,
  total: data.length,
});

export const mehtaProfile: EmployeeProfile = {
  ...mehtaListItem,
  jobFamily: { code: 'SWE', name: 'Software' },
  employmentType: 'full_time',
  fte: '1.00',
  terminationDate: null,
  manager: null,
  gender: 'male',
  version: 3,
};

export const mehtaHistory: SalaryRecordJson[] = [
  {
    id: 'b2c3d4e5-f6a7-4b8c-9d0e-1f2a3b4c5d6e',
    salary: inr(2_850_000),
    frequency: 'annual',
    effectiveFrom: '2024-04-01',
    effectiveTo: null,
    reason: 'merit',
    note: null,
    createdAt: '2024-03-20T09:00:00.000Z',
  },
  {
    id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
    salary: inr(2_500_000),
    frequency: 'annual',
    effectiveFrom: '2022-04-01',
    effectiveTo: '2024-04-01',
    reason: 'hire',
    note: null,
    createdAt: '2022-03-20T09:00:00.000Z',
  },
];

/** Answers for the lookups every screen may ask for; specs add their own on top. */
export const lookupHandlers = [
  // Sign-in off unless a spec says otherwise (ADR-014).
  http.get('/api/v1/auth/config', () =>
    HttpResponse.json({ authEnabled: false, googleClientId: null }),
  ),
  http.get('/api/v1/countries', () => HttpResponse.json(countries)),
  http.get('/api/v1/departments', () => HttpResponse.json(departments)),
  http.get('/api/v1/job-families', () => HttpResponse.json(jobFamilies)),
  http.get('/api/v1/job-levels', () => HttpResponse.json(jobLevels)),
];
