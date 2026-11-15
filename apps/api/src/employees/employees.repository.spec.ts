import type { PGlite } from '@electric-sql/pglite';
import {
  type EmployeeDirectoryQuery,
  EmployeeDirectoryQuerySchema,
} from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { EmployeesRepository } from './employees.repository.js';

// Expected values come from the table in src/db/testing/mini-acme.ts.
describe('EmployeesRepository.search', () => {
  let pglite: PGlite;
  let repository: EmployeesRepository;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    repository = new EmployeesRepository(drizzle(pglite));
  });

  afterAll(async () => {
    await pglite.close();
  });

  const query = (input: Record<string, unknown> = {}): EmployeeDirectoryQuery =>
    EmployeeDirectoryQuerySchema.parse(input);

  /** "ACME-000007" → 7, so expectations read like the fixture table. */
  async function numbersFor(input: Record<string, unknown>) {
    const { rows } = await repository.search(query(input));
    return rows.map((row) => Number(row.employeeCode.slice(-6)));
  }

  it('returns everyone sorted by last name, with the total', async () => {
    const { rows, total } = await repository.search(query());

    expect(total).toBe(12);
    expect(rows.map((row) => row.lastName)).toEqual([
      'Brown',
      'Clarke',
      'Davis',
      'Evans',
      'Gupta',
      'Johnson',
      'Mehta',
      'Patel',
      'Sharma',
      'Smith',
      'Taylor',
      'Wilson',
    ]);
  });

  it('returns the requested page and still counts every match', async () => {
    const { rows, total } = await repository.search(
      query({ page: 3, pageSize: 5 }),
    );

    expect(total).toBe(12);
    expect(rows.map((row) => row.lastName)).toEqual(['Taylor', 'Wilson']);
  });

  it.each([
    [{ country: ['IN', 'GB'] }, [11, 12, 3, 1, 4, 2, 10, 9]],
    [{ department: 'SAL' }, [7, 8, 3, 4, 10]],
    [{ level: 'IC3' }, [4, 2]],
    [{ status: ['on_leave', 'terminated'] }, [8, 4]],
    [{ bandPosition: 'below' }, [7, 11, 3]],
    [{ bandPosition: 'above' }, [12, 4]],
  ])('filters by %o', async (filter, expected) => {
    expect(await numbersFor(filter)).toEqual(expected);
  });

  it('filters by manager', async () => {
    const { rows } = await repository.search(query({ q: 'Liam' }));
    const managerId = rows[0]?.id;

    expect(await numbersFor({ managerId })).toEqual([7, 5]);
  });

  it.each([
    ['part of a name, in any case', 'MEH', [1]],
    ['a full name', 'olivia brown', [7]],
    ['part of an employee code', '000012', [12]],
    ['an email address', 'amelia.wilson@', [9]],
  ])('searches by %s', async (_case, q, expected) => {
    expect(await numbersFor({ q })).toEqual(expected);
  });

  it('treats % and _ in a search as plain characters', async () => {
    expect(await numbersFor({ q: '%%' })).toEqual([]);
  });

  it('sorts by annual salary in the reporting currency, people without one last', async () => {
    expect(await numbersFor({ sort: 'annualReporting:desc' })).toEqual([
      12, 6, 5, 9, 10, 11, 7, 1, 4, 3, 2, 8,
    ]);
  });

  it('sorts by compa-ratio, people without a salary or band last', async () => {
    expect(await numbersFor({ sort: 'compaRatio:asc' })).toEqual([
      3, 7, 11, 10, 2, 1, 9, 5, 6, 12, 4, 8,
    ]);
  });

  it('returns the current salary and the current band of each person', async () => {
    const { rows } = await repository.search(query({ q: 'Diya' }));

    expect(rows[0]).toMatchObject({
      employeeCode: 'ACME-000002',
      departmentName: 'Engineering',
      levelCode: 'IC3',
      hireDate: '2021-06-01',
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
    });
  });

  it('returns no salary for someone who has left', async () => {
    const { rows } = await repository.search(query({ q: 'Noah' }));

    expect(rows[0]).toMatchObject({ status: 'terminated', salary: null });
  });
});
