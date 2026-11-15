import { annualize, Money } from '@paylens/domain';
import { type GeneratedOrg, generateAcme } from './generate.js';

const AS_OF = '2026-11-01';

// The targets from docs/vault/design/seed.md, asserted on 2,000 generated people.
describe('generateAcme', () => {
  let org: GeneratedOrg;

  beforeAll(() => {
    org = generateAcme({ size: 2_000, seed: 42, asOf: AS_OF });
  });

  const share = (count: number) => count / org.employees.length;

  it('is deterministic: the same seed gives the same organisation', () => {
    const again = generateAcme({ size: 2_000, seed: 42, asOf: AS_OF });

    expect(again.employees.slice(0, 5)).toEqual(org.employees.slice(0, 5));
    expect(again.salaryRecords.length).toBe(org.salaryRecords.length);
  });

  it('changes with the seed', () => {
    const other = generateAcme({ size: 50, seed: 7, asOf: AS_OF });

    expect(other.employees[0]?.workEmail).not.toBe(org.employees[0]?.workEmail);
  });

  it('generates the requested headcount with unique codes and emails', () => {
    expect(org.employees).toHaveLength(2_000);
    expect(new Set(org.employees.map((e) => e.employeeCode)).size).toBe(2_000);
    expect(
      new Set(org.employees.map((e) => e.workEmail.toLowerCase())).size,
    ).toBe(2_000);
  });

  it.each([
    ['IN', 0.3],
    ['US', 0.25],
    ['GB', 0.12],
    ['DE', 0.1],
    ['CA', 0.07],
    ['SG', 0.06],
    ['AU', 0.06],
    ['BR', 0.04],
  ])(
    'places about %s × %d of people in each country (±2 points)',
    (country, target) => {
      const actual = share(
        org.employees.filter((e) => e.countryCode === country).length,
      );

      expect(Math.abs(actual - target)).toBeLessThanOrEqual(0.02);
    },
  );

  it('records gender as female or male only, about 48% female', () => {
    const genders = new Set(org.employees.map((e) => e.gender));
    const female = share(
      org.employees.filter((e) => e.gender === 'female').length,
    );

    expect([...genders].sort()).toEqual(['female', 'male']);
    expect(Math.abs(female - 0.48)).toBeLessThanOrEqual(0.03);
  });

  it('pays everyone in their country’s currency', () => {
    const currencyOf = new Map(
      org.countries.map((c) => [c.code, c.currencyCode]),
    );
    const countryOf = new Map(org.employees.map((e) => [e.id, e.countryCode]));

    for (const record of org.salaryRecords) {
      expect(record.currency).toBe(
        currencyOf.get(countryOf.get(record.employeeId) ?? ''),
      );
    }
  });

  it('keeps every salary history contiguous, with no overlaps and one open record at most', () => {
    const byEmployee = Map.groupBy(org.salaryRecords, (r) => r.employeeId);

    for (const employee of org.employees) {
      const history = (byEmployee.get(employee.id) ?? []).toSorted((a, b) =>
        a.effectiveFrom.localeCompare(b.effectiveFrom),
      );
      expect(history.length).toBeGreaterThan(0);
      history.forEach((record, index) => {
        const next = history[index + 1];
        if (next) expect(record.effectiveTo).toBe(next.effectiveFrom);
      });
      const last = history.at(-1);
      if (employee.status === 'terminated') {
        expect(last?.effectiveTo).toBe(employee.terminationDate);
      } else {
        expect(last?.effectiveTo).toBeNull();
      }
    }
  });

  it('puts 10–14% of current salaries outside their band', () => {
    let outside = 0;
    let counted = 0;
    for (const employee of org.employees.filter(
      (e) => e.status !== 'terminated',
    )) {
      const current = org.salaryRecords.find(
        (r) => r.employeeId === employee.id && r.effectiveTo === null,
      );
      const band = org.payBands.find(
        (b) =>
          b.levelCode === employee.levelCode &&
          b.countryCode === employee.countryCode &&
          b.effectiveFrom <= AS_OF &&
          (b.effectiveTo === null || b.effectiveTo > AS_OF),
      );
      if (!current || !band) continue;
      const annual = annualize(
        Money.of(current.amountMinor, current.currency),
        current.frequency,
      );
      counted += 1;
      if (
        annual.amountMinor < band.minMinor ||
        annual.amountMinor > band.maxMinor
      )
        outside += 1;
    }

    expect(counted).toBeGreaterThan(1_800);
    expect(outside / counted).toBeGreaterThanOrEqual(0.1);
    expect(outside / counted).toBeLessThanOrEqual(0.14);
  });

  it('pays monthly in India, Germany and Brazil and annually elsewhere', () => {
    const monthlyCountries = new Set(['IN', 'DE', 'BR']);
    const countryOf = new Map(org.employees.map((e) => [e.id, e.countryCode]));

    for (const record of org.salaryRecords) {
      const expected = monthlyCountries.has(
        countryOf.get(record.employeeId) ?? '',
      )
        ? 'monthly'
        : 'annual';
      expect(record.frequency).toBe(expected);
    }
  });

  it('gives each manager-led person a manager in the same country and department', () => {
    const byId = new Map(org.employees.map((e) => [e.id, e]));
    const withManager = org.employees.filter((e) => e.managerId !== null);

    expect(withManager.length).toBeGreaterThan(1_500);
    for (const employee of withManager) {
      const manager = byId.get(employee.managerId ?? '');
      expect(manager?.countryCode).toBe(employee.countryCode);
      expect(manager?.departmentCode).toBe(employee.departmentCode);
      expect(manager?.levelCode).toMatch(/^M/);
    }
  });

  it('has one valid band per level and country on the as-of date', () => {
    for (const level of org.jobLevels) {
      for (const country of org.countries) {
        const current = org.payBands.filter(
          (b) =>
            b.levelCode === level.code &&
            b.countryCode === country.code &&
            b.effectiveFrom <= AS_OF &&
            (b.effectiveTo === null || b.effectiveTo > AS_OF),
        );
        expect(current).toHaveLength(1);
        const [band] = current;
        expect(
          band &&
            band.minMinor < band.midMinor &&
            band.midMinor < band.maxMinor,
        ).toBe(true);
      }
    }
  });
});
