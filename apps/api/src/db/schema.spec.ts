import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './testing/pglite.js';

/**
 * The database's own guarantees (data-model.md, ADR-005). These hold whatever the
 * application code does, so they are tested with plain SQL.
 */
describe('database schema', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDatabase();
    await db.exec(`
      insert into currencies (code, name, minor_units) values ('INR', 'Indian rupee', 2);
      insert into countries (code, name, currency_code, region) values ('IN', 'India', 'INR', 'APAC');
      insert into departments (code, name) values ('ENG', 'Engineering');
      insert into job_families (code, name) values ('SWE', 'Software');
      insert into job_levels (code, track, rank) values ('IC4', 'ic', 4);
    `);
  });

  afterAll(async () => {
    await db.close();
  });

  /** Inserts an employee and returns its id; each test gets its own. */
  async function anEmployee(code: string, email = `${code}@acme.test`) {
    const result = await db.query<{ id: string }>(
      `insert into employees (employee_code, first_name, last_name, work_email, country_code,
         department_id, job_family_id, job_level_id, job_title, employment_type, fte,
         hire_date, status, gender)
       select $1, 'Aarav', 'Mehta', $2, 'IN', d.id, f.id, l.id, 'Software Engineer',
              'full_time', 1, '2019-03-12', 'active', 'male'
       from departments d, job_families f, job_levels l
       returning id`,
      [code, email],
    );
    const id = result.rows[0]?.id;
    if (!id) throw new Error('employee not inserted');
    return id;
  }

  function aSalary(employeeId: string, from: string, to: string | null) {
    return db.query(
      `insert into salary_records (employee_id, amount_minor, currency_code, pay_frequency,
         effective_from, effective_to, reason)
       values ($1, 285000000, 'INR', 'annual', $2, $3, 'merit')`,
      [employeeId, from, to],
    );
  }

  describe('salary records', () => {
    it('rejects overlapping periods for one employee', async () => {
      const employee = await anEmployee('ACME-000001');
      await aSalary(employee, '2023-04-01', '2025-04-01');

      await expect(aSalary(employee, '2024-10-01', null)).rejects.toThrow(
        /exclusion constraint/,
      );
    });

    it('accepts contiguous periods', async () => {
      const employee = await anEmployee('ACME-000002');
      await aSalary(employee, '2023-04-01', '2025-04-01');

      await expect(
        aSalary(employee, '2025-04-01', null),
      ).resolves.toBeDefined();
    });

    it('accepts a superseded zero-length record next to its replacement', async () => {
      const employee = await anEmployee('ACME-000003');
      await aSalary(employee, '2025-04-01', '2025-04-01');

      await expect(
        aSalary(employee, '2025-04-01', null),
      ).resolves.toBeDefined();
    });

    it('rejects a period that ends before it starts', async () => {
      const employee = await anEmployee('ACME-000004');

      await expect(
        aSalary(employee, '2025-04-01', '2025-03-31'),
      ).rejects.toThrow(/check constraint/);
    });

    it('lets only effective_to change, so history is never rewritten', async () => {
      const employee = await anEmployee('ACME-000005');
      await aSalary(employee, '2025-04-01', null);

      await expect(
        db.query(
          `update salary_records set effective_to = '2026-04-01' where employee_id = $1`,
          [employee],
        ),
      ).resolves.toBeDefined();
      await expect(
        db.query(
          `update salary_records set amount_minor = 1 where employee_id = $1`,
          [employee],
        ),
      ).rejects.toThrow(/only effective_to/);
    });

    it('refuses to delete salary history', async () => {
      const employee = await anEmployee('ACME-000006');
      await aSalary(employee, '2025-04-01', null);

      await expect(
        db.query(`delete from salary_records where employee_id = $1`, [
          employee,
        ]),
      ).rejects.toThrow(/never deleted/);
    });

    it('shows the record valid today in current_salaries', async () => {
      const employee = await anEmployee('ACME-000007');
      await aSalary(employee, '2000-01-01', '2001-01-01');
      await aSalary(employee, '2001-01-01', null);

      const current = await db.query<{ effective_from: string }>(
        `select effective_from::text from current_salaries where employee_id = $1`,
        [employee],
      );

      expect(current.rows).toEqual([{ effective_from: '2001-01-01' }]);
    });
  });

  describe('pay bands', () => {
    function aBand(min: number, mid: number, max: number, from = '2024-01-01') {
      return db.query(
        `insert into pay_bands (job_level_id, country_code, currency_code, min_minor, mid_minor,
           max_minor, effective_from)
         select id, 'IN', 'INR', $1, $2, $3, $4 from job_levels`,
        [min, mid, max, from],
      );
    }

    it('rejects a band whose minimum is above its midpoint', async () => {
      await expect(aBand(310, 300, 360)).rejects.toThrow(/check constraint/);
    });

    it('rejects overlapping bands for the same level and country', async () => {
      await aBand(240, 300, 360, '2024-01-01');

      await expect(aBand(250, 310, 370, '2025-01-01')).rejects.toThrow(
        /exclusion constraint/,
      );
    });
  });

  describe('employees and users', () => {
    it('treats work emails case-insensitively when enforcing uniqueness', async () => {
      await anEmployee('ACME-000101', 'Priya.Nair@acme.test');

      await expect(
        anEmployee('ACME-000102', 'priya.nair@ACME.test'),
      ).rejects.toThrow(/unique constraint/);
    });

    it('records gender as female or male only (D-2)', async () => {
      const employee = await anEmployee('ACME-000103');

      await expect(
        db.query(`update employees set gender = 'other' where id = $1`, [
          employee,
        ]),
      ).rejects.toThrow(/invalid input value for enum/);
    });
  });

  describe('audit events', () => {
    it('are append-only: no updates and no deletes, for any role', async () => {
      await db.query(
        `insert into audit_events (action, entity_type, entity_id, request_id)
         values ('salary.changed', 'employee', gen_random_uuid(), 'req-1')`,
      );

      await expect(
        db.query(`update audit_events set action = 'x'`),
      ).rejects.toThrow(/append-only/);
      await expect(db.query(`delete from audit_events`)).rejects.toThrow(
        /append-only/,
      );
    });
  });
});
