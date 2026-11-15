import {
  type Faker,
  fakerDE,
  fakerEN,
  fakerEN_AU,
  fakerEN_CA,
  fakerEN_GB,
  fakerEN_IN,
  fakerEN_US,
  fakerPT_BR,
} from '@faker-js/faker';

// Reference data and targets for the ACME seed (docs/vault/design/seed.md).

export interface CountrySeed {
  readonly code: string;
  readonly name: string;
  readonly currencyCode: string;
  readonly region: string;
  /** Share of headcount. */
  readonly share: number;
  /** Labour-cost proxy relative to the US (illustrative). */
  readonly costIndex: number;
  /** How salaries are expressed there (exercises annualisation). */
  readonly frequency: 'annual' | 'monthly';
  /** Locale for names. */
  readonly faker: Faker;
}

export const COUNTRIES: readonly CountrySeed[] = [
  {
    code: 'IN',
    name: 'India',
    currencyCode: 'INR',
    region: 'APAC',
    share: 0.3,
    costIndex: 0.26,
    frequency: 'monthly',
    faker: fakerEN_IN,
  },
  {
    code: 'US',
    name: 'United States',
    currencyCode: 'USD',
    region: 'Americas',
    share: 0.25,
    costIndex: 1,
    frequency: 'annual',
    faker: fakerEN_US,
  },
  {
    code: 'GB',
    name: 'United Kingdom',
    currencyCode: 'GBP',
    region: 'EMEA',
    share: 0.12,
    costIndex: 0.78,
    frequency: 'annual',
    faker: fakerEN_GB,
  },
  {
    code: 'DE',
    name: 'Germany',
    currencyCode: 'EUR',
    region: 'EMEA',
    share: 0.1,
    costIndex: 0.8,
    frequency: 'monthly',
    faker: fakerDE,
  },
  {
    code: 'CA',
    name: 'Canada',
    currencyCode: 'CAD',
    region: 'Americas',
    share: 0.07,
    costIndex: 0.82,
    frequency: 'annual',
    faker: fakerEN_CA,
  },
  {
    code: 'SG',
    name: 'Singapore',
    currencyCode: 'SGD',
    region: 'APAC',
    share: 0.06,
    costIndex: 0.8,
    frequency: 'annual',
    faker: fakerEN,
  },
  {
    code: 'AU',
    name: 'Australia',
    currencyCode: 'AUD',
    region: 'APAC',
    share: 0.06,
    costIndex: 0.85,
    frequency: 'annual',
    faker: fakerEN_AU,
  },
  {
    code: 'BR',
    name: 'Brazil',
    currencyCode: 'BRL',
    region: 'Americas',
    share: 0.04,
    costIndex: 0.32,
    frequency: 'monthly',
    faker: fakerPT_BR,
  },
];

export const CURRENCIES = [
  { code: 'USD', name: 'US dollar', minorUnits: 2 },
  { code: 'INR', name: 'Indian rupee', minorUnits: 2 },
  { code: 'GBP', name: 'Pound sterling', minorUnits: 2 },
  { code: 'EUR', name: 'Euro', minorUnits: 2 },
  { code: 'CAD', name: 'Canadian dollar', minorUnits: 2 },
  { code: 'SGD', name: 'Singapore dollar', minorUnits: 2 },
  { code: 'AUD', name: 'Australian dollar', minorUnits: 2 },
  { code: 'BRL', name: 'Brazilian real', minorUnits: 2 },
] as const;

/** Sample USD-based rates ("1 USD = rate × quote"), labelled as samples, not live data. */
export const FX_RATES: readonly {
  quote: string;
  rate: string;
  asOf: string;
}[] = [
  ...Object.entries({
    INR: '81.40',
    GBP: '0.80',
    EUR: '0.94',
    CAD: '1.33',
    SGD: '1.31',
    AUD: '1.49',
    BRL: '5.10',
  }).map(([quote, rate]) => ({ quote, rate, asOf: '2025-11-01' })),
  ...Object.entries({
    INR: '83.00',
    GBP: '0.78',
    EUR: '0.92',
    CAD: '1.36',
    SGD: '1.34',
    AUD: '1.52',
    BRL: '5.30',
  }).map(([quote, rate]) => ({ quote, rate, asOf: '2026-11-01' })),
];

export const JOB_FAMILIES = [
  { code: 'SWE', name: 'Software', role: 'Software Engineer' },
  { code: 'DAT', name: 'Data', role: 'Data Scientist' },
  { code: 'PDD', name: 'Product & Design', role: 'Product Designer' },
  { code: 'GTM', name: 'Go-to-market', role: 'Account Executive' },
  { code: 'BOP', name: 'Business Operations', role: 'Operations Analyst' },
  { code: 'COR', name: 'Corporate', role: 'Business Partner' },
] as const;

/** Departments with their share of headcount and the job families people there belong to. */
export const DEPARTMENTS: readonly {
  code: string;
  name: string;
  share: number;
  families: readonly { code: string; weight: number }[];
}[] = [
  {
    code: 'ENG',
    name: 'Engineering',
    share: 0.34,
    families: [
      { code: 'SWE', weight: 0.75 },
      { code: 'DAT', weight: 0.25 },
    ],
  },
  {
    code: 'SAL',
    name: 'Sales',
    share: 0.14,
    families: [{ code: 'GTM', weight: 1 }],
  },
  {
    code: 'CS',
    name: 'Customer Success',
    share: 0.1,
    families: [{ code: 'GTM', weight: 1 }],
  },
  {
    code: 'OPS',
    name: 'Operations',
    share: 0.09,
    families: [{ code: 'BOP', weight: 1 }],
  },
  {
    code: 'PRD',
    name: 'Product',
    share: 0.08,
    families: [{ code: 'PDD', weight: 1 }],
  },
  {
    code: 'MKT',
    name: 'Marketing',
    share: 0.07,
    families: [{ code: 'GTM', weight: 1 }],
  },
  {
    code: 'FIN',
    name: 'Finance',
    share: 0.06,
    families: [{ code: 'COR', weight: 1 }],
  },
  {
    code: 'PPL',
    name: 'People',
    share: 0.05,
    families: [{ code: 'COR', weight: 1 }],
  },
  {
    code: 'DSN',
    name: 'Design',
    share: 0.04,
    families: [{ code: 'PDD', weight: 1 }],
  },
  {
    code: 'LEG',
    name: 'Legal',
    share: 0.03,
    families: [{ code: 'COR', weight: 1 }],
  },
];

/** Global levels: a pyramid, IC2–IC4 dense, IC6 and M4 rare (≈1%). Mid salaries in USD. */
export const JOB_LEVELS: readonly {
  code: string;
  track: 'ic' | 'manager';
  rank: number;
  weight: number;
  baseMidUsd: number;
  titlePrefix: string;
}[] = [
  {
    code: 'IC1',
    track: 'ic',
    rank: 1,
    weight: 0.08,
    baseMidUsd: 55_000,
    titlePrefix: 'Associate',
  },
  {
    code: 'IC2',
    track: 'ic',
    rank: 2,
    weight: 0.2,
    baseMidUsd: 72_000,
    titlePrefix: '',
  },
  {
    code: 'IC3',
    track: 'ic',
    rank: 3,
    weight: 0.24,
    baseMidUsd: 95_000,
    titlePrefix: '',
  },
  {
    code: 'IC4',
    track: 'ic',
    rank: 4,
    weight: 0.18,
    baseMidUsd: 125_000,
    titlePrefix: 'Senior',
  },
  {
    code: 'IC5',
    track: 'ic',
    rank: 5,
    weight: 0.09,
    baseMidUsd: 160_000,
    titlePrefix: 'Staff',
  },
  {
    code: 'IC6',
    track: 'ic',
    rank: 6,
    weight: 0.01,
    baseMidUsd: 205_000,
    titlePrefix: 'Principal',
  },
  {
    code: 'M1',
    track: 'manager',
    rank: 4,
    weight: 0.09,
    baseMidUsd: 140_000,
    titlePrefix: 'Manager,',
  },
  {
    code: 'M2',
    track: 'manager',
    rank: 5,
    weight: 0.06,
    baseMidUsd: 175_000,
    titlePrefix: 'Senior Manager,',
  },
  {
    code: 'M3',
    track: 'manager',
    rank: 6,
    weight: 0.04,
    baseMidUsd: 215_000,
    titlePrefix: 'Director,',
  },
  {
    code: 'M4',
    track: 'manager',
    rank: 7,
    weight: 0.01,
    baseMidUsd: 265_000,
    titlePrefix: 'VP,',
  },
];

/** Bands of these countries got a second generation (+4% on 2026-01-01), so band history has content. */
export const BAND_REFRESH = {
  countries: ['US', 'GB', 'DE'],
  from: '2026-01-01',
  increase: 1.04,
} as const;
export const BANDS_FROM = '2024-01-01';
