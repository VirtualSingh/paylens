import { base, en, Faker } from '@faker-js/faker';
import type { IsoDate } from '@paylens/domain';
import {
  BAND_REFRESH,
  BANDS_FROM,
  COUNTRIES,
  type CountrySeed,
  CURRENCIES,
  DEPARTMENTS,
  FX_RATES,
  JOB_FAMILIES,
  JOB_LEVELS,
} from './reference-data.js';

// A deterministic, realistic ACME (docs/vault/design/seed.md). Floats are used only to invent
// plausible amounts; every amount is rounded to whole currency units and stored as integer
// minor units. Money arithmetic in the application never happens here.

export interface GeneratedEmployee {
  readonly id: string;
  readonly employeeCode: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly workEmail: string;
  readonly countryCode: string;
  readonly departmentCode: string;
  readonly jobFamilyCode: string;
  readonly levelCode: string;
  readonly jobTitle: string;
  managerId: string | null;
  readonly employmentType: 'full_time' | 'part_time' | 'contractor';
  readonly fte: string;
  readonly hireDate: IsoDate;
  readonly terminationDate: IsoDate | null;
  readonly status: 'active' | 'on_leave' | 'terminated';
  readonly gender: 'female' | 'male';
}

export interface GeneratedSalaryRecord {
  readonly id: string;
  readonly employeeId: string;
  readonly amountMinor: bigint;
  readonly currency: string;
  readonly frequency: 'annual' | 'monthly';
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
  readonly reason: 'hire' | 'merit' | 'promotion' | 'correction';
  readonly note: string | null;
}

export interface GeneratedBand {
  readonly levelCode: string;
  readonly countryCode: string;
  readonly currency: string;
  readonly minMinor: bigint;
  readonly midMinor: bigint;
  readonly maxMinor: bigint;
  readonly effectiveFrom: IsoDate;
  readonly effectiveTo: IsoDate | null;
}

export interface GeneratedOrg {
  readonly currencies: readonly {
    code: string;
    name: string;
    minorUnits: number;
  }[];
  readonly countries: readonly {
    code: string;
    name: string;
    currencyCode: string;
    region: string;
  }[];
  readonly departments: readonly { code: string; name: string }[];
  readonly jobFamilies: readonly { code: string; name: string }[];
  readonly jobLevels: readonly { code: string; track: string; rank: number }[];
  readonly fxRates: readonly { quote: string; rate: string; asOf: IsoDate }[];
  readonly payBands: readonly GeneratedBand[];
  readonly employees: readonly GeneratedEmployee[];
  readonly salaryRecords: readonly GeneratedSalaryRecord[];
}

export interface GenerateOptions {
  readonly size: number;
  readonly seed: number;
  /** The "today" of the dataset: current salaries are those valid on this date. */
  readonly asOf: IsoDate;
}

const FIRST_HIRE: IsoDate = '2014-01-01';
const LAST_HIRE: IsoDate = '2026-10-31';

export function generateAcme({
  size,
  seed,
  asOf,
}: GenerateOptions): GeneratedOrg {
  const random = new Faker({ locale: [en, base] });
  random.seed(seed);
  COUNTRIES.forEach((country, index) => country.faker.seed(seed * 100 + index));

  const payBands = generateBands();
  const emails = new Set<string>();
  const employees = Array.from({ length: size }, (_, index) =>
    generatePerson(index, random, asOf, emails),
  );
  assignManagers(employees, random);
  const salaryRecords = employees.flatMap((person) =>
    generateHistory(person, payBands, random, asOf),
  );

  return {
    currencies: CURRENCIES,
    countries: COUNTRIES.map(({ code, name, currencyCode, region }) => ({
      code,
      name,
      currencyCode,
      region,
    })),
    departments: DEPARTMENTS.map(({ code, name }) => ({ code, name })),
    jobFamilies: JOB_FAMILIES.map(({ code, name }) => ({ code, name })),
    jobLevels: JOB_LEVELS.map(({ code, track, rank }) => ({
      code,
      track,
      rank,
    })),
    fxRates: FX_RATES,
    payBands,
    employees,
    salaryRecords,
  };
}

// --- Pay bands -----------------------------------------------------------------------------

/** mid = base USD mid × country cost index × FX rate, to 3 significant figures; ±20%. */
function generateBands(): GeneratedBand[] {
  return JOB_LEVELS.flatMap((level) =>
    COUNTRIES.flatMap((country) => {
      const refreshed = BAND_REFRESH.countries.some(
        (code) => code === country.code,
      );
      const mid = threeSignificantFigures(
        level.baseMidUsd * country.costIndex * usdRate(country.currencyCode),
      );
      const firstGeneration = band(
        level.code,
        country,
        mid,
        BANDS_FROM,
        refreshed ? BAND_REFRESH.from : null,
      );
      return refreshed
        ? [
            firstGeneration,
            band(
              level.code,
              country,
              threeSignificantFigures(mid * BAND_REFRESH.increase),
              BAND_REFRESH.from,
              null,
            ),
          ]
        : [firstGeneration];
    }),
  );
}

function band(
  levelCode: string,
  country: CountrySeed,
  midUnits: number,
  effectiveFrom: IsoDate,
  effectiveTo: IsoDate | null,
): GeneratedBand {
  return {
    levelCode,
    countryCode: country.code,
    currency: country.currencyCode,
    minMinor: units(midUnits * 0.8),
    midMinor: units(midUnits),
    maxMinor: units(midUnits * 1.2),
    effectiveFrom,
    effectiveTo,
  };
}

function bandOn(
  bands: readonly GeneratedBand[],
  levelCode: string,
  countryCode: string,
  date: IsoDate,
) {
  const found = bands.find(
    (b) =>
      b.levelCode === levelCode &&
      b.countryCode === countryCode &&
      b.effectiveFrom <= date &&
      (b.effectiveTo === null || date < b.effectiveTo),
  );
  if (!found)
    throw new Error(`No band for ${levelCode} in ${countryCode} on ${date}`);
  return found;
}

// --- People --------------------------------------------------------------------------------

function generatePerson(
  index: number,
  random: Faker,
  asOf: IsoDate,
  emails: Set<string>,
): GeneratedEmployee {
  const country = weighted(
    random,
    COUNTRIES.map((c) => ({ weight: c.share, value: c })),
  );
  const department = weighted(
    random,
    DEPARTMENTS.map((d) => ({ weight: d.share, value: d })),
  );
  const familyCode = weighted(
    random,
    department.families.map((f) => ({ weight: f.weight, value: f.code })),
  );
  const level = weighted(
    random,
    JOB_LEVELS.map((l) => ({ weight: l.weight, value: l })),
  );
  const gender = weighted(random, [
    { weight: 0.48, value: 'female' as const },
    { weight: 0.52, value: 'male' as const },
  ]);
  const employmentType = weighted(random, [
    { weight: 0.9, value: 'full_time' as const },
    { weight: 0.06, value: 'part_time' as const },
    { weight: 0.04, value: 'contractor' as const },
  ]);

  // Hire dates lean towards recent years (a growing company): u^0.6 skews towards 1.
  const latestHire = minDate(LAST_HIRE, addDays(asOf, -1));
  const hireDate = addDays(
    FIRST_HIRE,
    Math.floor(
      random.number.float({ min: 0, max: 1 }) ** 0.6 *
        daysBetween(FIRST_HIRE, latestHire),
    ),
  );
  let status = weighted(random, [
    { weight: 0.92, value: 'active' as const },
    { weight: 0.03, value: 'on_leave' as const },
    { weight: 0.05, value: 'terminated' as const },
  ]);
  const tenureDays = daysBetween(hireDate, asOf);
  if (status === 'terminated' && tenureDays < 120) status = 'active';
  const terminationDate =
    status === 'terminated'
      ? addDays(
          hireDate,
          90 + random.number.int({ min: 0, max: tenureDays - 91 }),
        )
      : null;

  const firstName = country.faker.person.firstName(gender);
  const lastName = country.faker.person.lastName(gender);
  const role =
    JOB_FAMILIES.find((f) => f.code === familyCode)?.role ?? 'Specialist';

  return {
    id: random.string.uuid(),
    employeeCode: `ACME-${String(index + 1).padStart(6, '0')}`,
    firstName,
    lastName,
    workEmail: uniqueEmail(firstName, lastName, emails),
    countryCode: country.code,
    departmentCode: department.code,
    jobFamilyCode: familyCode,
    levelCode: level.code,
    jobTitle:
      level.track === 'manager'
        ? `${level.titlePrefix} ${department.name}`
        : `${level.titlePrefix} ${role}`.trim(),
    managerId: null,
    employmentType,
    fte:
      employmentType === 'part_time'
        ? random.helpers.arrayElement(['0.50', '0.60', '0.70', '0.80'])
        : '1.00',
    hireDate,
    terminationDate,
    status,
    gender,
  };
}

/**
 * Managers come from the same country and department (seed.md): individual contributors
 * report to an M1/M2 where there is one, managers to someone more senior.
 */
function assignManagers(people: GeneratedEmployee[], random: Faker): void {
  const rankOf = new Map(JOB_LEVELS.map((l) => [l.code, l.rank]));
  const groups = Map.groupBy(
    people,
    (p) => `${p.countryCode}|${p.departmentCode}`,
  );
  for (const group of groups.values()) {
    const managers = group.filter((p) => p.levelCode.startsWith('M'));
    for (const person of group) {
      const rank = rankOf.get(person.levelCode) ?? 0;
      const candidates = person.levelCode.startsWith('M')
        ? managers.filter((m) => (rankOf.get(m.levelCode) ?? 0) > rank)
        : managers.filter((m) => m.levelCode === 'M1' || m.levelCode === 'M2');
      const pool =
        candidates.length > 0 || person.levelCode.startsWith('M')
          ? candidates
          : managers;
      person.managerId =
        pool.length > 0 ? random.helpers.arrayElement(pool).id : null;
    }
  }
}

// --- Salary history ------------------------------------------------------------------------

/**
 * Up to six contiguous records: the hire (if within reach) and the April-1 cycles since,
 * walked backwards from today's salary with 3–12% merit raises and occasional promotions.
 */
function generateHistory(
  person: GeneratedEmployee,
  bands: readonly GeneratedBand[],
  random: Faker,
  asOf: IsoDate,
): GeneratedSalaryRecord[] {
  const country = COUNTRIES.find((c) => c.code === person.countryCode);
  if (!country) throw new Error(`Unknown country ${person.countryCode}`);

  const starts = cycleStarts(
    person.hireDate,
    person.terminationDate ?? asOf,
    person.terminationDate === null,
  ).slice(-6);
  const lastStart = starts.at(-1) ?? person.hireDate;
  // The band in force when the latest salary started (hires before 2024 use the first bands).
  const currentBand = bandOn(
    bands,
    person.levelCode,
    person.countryCode,
    maxDate(lastStart, BANDS_FROM),
  );

  // Today's position: ~8% below band, ~4% above, the rest inside (seed.md).
  const position = weighted(random, [
    { weight: 0.08, value: 'below' as const },
    { weight: 0.04, value: 'above' as const },
    { weight: 0.88, value: 'within' as const },
  ]);
  const factor =
    position === 'below'
      ? random.number.float({ min: 0.7, max: 0.78 })
      : position === 'above'
        ? random.number.float({ min: 1.22, max: 1.32 })
        : Math.min(1.19, Math.max(0.81, Math.exp(normal(random, 0.07))));

  const annualAmounts: number[] = [
    Number(currentBand.midMinor / 100n) * factor,
  ];
  const promotedAt = new Set<number>();
  for (let i = starts.length - 2; i >= 0; i -= 1) {
    const promotion = random.number.float({ min: 0, max: 1 }) < 0.08;
    if (promotion) promotedAt.add(i + 1);
    const raise = promotion
      ? random.number.float({ min: 0.12, max: 0.2 })
      : random.number.float({ min: 0.03, max: 0.12 });
    annualAmounts.unshift((annualAmounts[0] ?? 0) / (1 + raise));
  }
  const corrected =
    starts.length >= 2 && random.number.float({ min: 0, max: 1 }) < 1 / 300
      ? starts.length - 2
      : -1;

  return starts.map((effectiveFrom, i) => {
    const annual = annualAmounts[i] ?? 0;
    const isLast = i === starts.length - 1;
    return {
      id: random.string.uuid(),
      employeeId: person.id,
      amountMinor: units(
        country.frequency === 'monthly' ? annual / 12 : annual,
      ),
      currency: country.currencyCode,
      frequency: country.frequency,
      effectiveFrom,
      effectiveTo: isLast ? person.terminationDate : (starts[i + 1] ?? null),
      reason:
        i === corrected
          ? 'correction'
          : effectiveFrom === person.hireDate
            ? 'hire'
            : promotedAt.has(i)
              ? 'promotion'
              : 'merit',
      note:
        i === corrected
          ? 'Corrected a keying error in the original record'
          : promotedAt.has(i)
            ? 'Promotion'
            : null,
    };
  });
}

/** The hire date, then every 1 April after it — before `end`, or on/before it when open. */
function cycleStarts(
  hireDate: IsoDate,
  end: IsoDate,
  includeEnd: boolean,
): IsoDate[] {
  const starts = [hireDate];
  for (
    let year = Number(hireDate.slice(0, 4));
    year <= Number(end.slice(0, 4));
    year += 1
  ) {
    const april = `${year}-04-01`;
    if (april > hireDate && (april < end || (includeEnd && april === end)))
      starts.push(april);
  }
  return starts;
}

// --- Small helpers -------------------------------------------------------------------------

function weighted<T>(
  random: Faker,
  options: readonly { weight: number; value: T }[],
): T {
  return random.helpers.weightedArrayElement([...options]);
}

/** Box–Muller: a normally distributed number with mean 0. */
function normal(random: Faker, standardDeviation: number): number {
  const u1 = random.number.float({ min: Number.EPSILON, max: 1 });
  const u2 = random.number.float({ min: 0, max: 1 });
  return (
    Math.sqrt(-2 * Math.log(u1)) *
    Math.cos(2 * Math.PI * u2) *
    standardDeviation
  );
}

/** Whole currency units → integer minor units (all seed currencies have 2 decimals). */
function units(amount: number): bigint {
  return BigInt(Math.round(amount)) * 100n;
}

function threeSignificantFigures(value: number): number {
  const scale = 10 ** (Math.floor(Math.log10(value)) - 2);
  return Math.round(value / scale) * scale;
}

function usdRate(currency: string): number {
  if (currency === 'USD') return 1;
  const rate = FX_RATES.find(
    (r) => r.quote === currency && r.asOf === '2026-11-01',
  );
  if (!rate) throw new Error(`No sample FX rate for ${currency}`);
  return Number(rate.rate);
}

function uniqueEmail(
  firstName: string,
  lastName: string,
  taken: Set<string>,
): string {
  const slug = (text: string) =>
    text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z]/g, '');
  const stem = `${slug(firstName)}.${slug(lastName)}`;
  let email = `${stem}@acme.example`;
  for (let n = 2; taken.has(email); n += 1) email = `${stem}${n}@acme.example`;
  taken.add(email);
  return email;
}

function addDays(date: IsoDate, days: number): IsoDate {
  const result = new Date(`${date}T00:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

function daysBetween(from: IsoDate, to: IsoDate): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

const minDate = (a: IsoDate, b: IsoDate) => (a < b ? a : b);
const maxDate = (a: IsoDate, b: IsoDate) => (a > b ? a : b);
