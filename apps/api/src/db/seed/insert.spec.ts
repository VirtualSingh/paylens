import type { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { createTestDatabase } from '../testing/pglite.js';
import { generateAcme } from './generate.js';
import { insertOrg, SeedRefusedError } from './insert.js';

describe('insertOrg', () => {
  let pglite: PGlite;
  const org = generateAcme({ size: 200, seed: 42, asOf: '2026-11-01' });

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await insertOrg(drizzle(pglite), org, { batchSize: 64 });
  });

  afterAll(async () => {
    await pglite.close();
  });

  const count = async (table: string) =>
    (
      await pglite.query<{ n: number }>(
        `select count(*)::int as n from ${table}`,
      )
    ).rows[0]?.n;

  it('writes every generated person and salary record', async () => {
    expect(await count('employees')).toBe(200);
    expect(await count('salary_records')).toBe(org.salaryRecords.length);
    expect(await count('pay_bands')).toBe(org.payBands.length);
  });

  it('links managers after all people exist', async () => {
    const expected = org.employees.filter((e) => e.managerId !== null).length;

    expect(await count('employees where manager_id is not null')).toBe(
      expected,
    );
  });

  it('keeps the demo users of migration 0003 and adds one audit event per person', async () => {
    const users = await pglite.query<{ email: string; role: string }>(
      'select email, role::text from users where is_demo order by role',
    );

    expect(users.rows).toEqual([
      { email: 'demo.admin@paylens.app', role: 'admin' },
      { email: 'demo.hr@paylens.app', role: 'hr_manager' },
      { email: 'demo.viewer@paylens.app', role: 'viewer' },
    ]);
    expect(await count("audit_events where action = 'employee.imported'")).toBe(
      200,
    );
  });

  it('sets the reporting currency to USD', async () => {
    const setting = await pglite.query<{ value: unknown }>(
      "select value from settings where key = 'reporting_currency'",
    );

    expect(setting.rows[0]?.value).toBe('USD');
  });

  it('refuses to seed a database that already has employees', async () => {
    await expect(insertOrg(drizzle(pglite), org)).rejects.toThrow(
      SeedRefusedError,
    );
  });

  it('replaces everything when forced, keeping real users', async () => {
    await pglite.query(
      "insert into users (email, display_name, role) values ('someone@acme.example', 'Someone', 'admin')",
    );
    const smaller = generateAcme({ size: 50, seed: 7, asOf: '2026-11-01' });

    await insertOrg(drizzle(pglite), smaller, { force: true });

    expect(await count('employees')).toBe(50);
    expect(await count("users where email = 'someone@acme.example'")).toBe(1);
    expect(await count("audit_events where action = 'employee.imported'")).toBe(
      50,
    );
  });
});
