import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { nextEmployeeCode } from '@paylens/domain';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

// Mini-ACME (db/testing/mini-acme.ts): 12 people, codes ACME-000001…012, everyone at version 1.
describe('employee changes', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  async function idOf(code: string): Promise<string> {
    const result = await pglite.query<{ id: string }>(
      'select id from employees where employee_code = $1',
      [code],
    );
    return result.rows[0]?.id ?? '';
  }

  async function headCount(): Promise<number> {
    const result = await pglite.query<{ count: number }>(
      'select count(*)::int as count from employees',
    );
    return result.rows[0]?.count ?? -1;
  }

  const inr = (rupees: number) => ({
    amountMinor: String(rupees * 100),
    currency: 'INR',
  });

  const create = (body: object, role = 'hr_manager') =>
    request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-acting-role', role)
      .set('x-request-id', 'req-create-1')
      .send(body);

  // IN · IC3 band: ₹16L / ₹20L / ₹24L, so ₹20L a year is exactly mid.
  const kavya = (overrides: object = {}) => ({
    firstName: 'Kavya',
    lastName: 'Iyer',
    workEmail: 'kavya.iyer@acme.test',
    countryCode: 'IN',
    departmentCode: 'ENG',
    jobFamilyCode: 'SWE',
    levelCode: 'IC3',
    jobTitle: 'Software Engineer',
    employmentType: 'full_time',
    hireDate: '2026-11-02',
    gender: 'female',
    salary: { amount: inr(2_000_000), frequency: 'annual' },
    ...overrides,
  });

  describe('POST /employees', () => {
    it('creates a person with the next code, their pay and version 1', async () => {
      const highest = await pglite.query<{ code: string }>(
        'select max(employee_code) as code from employees',
      );

      const response = await create(
        kavya({ managerId: await idOf('ACME-000001') }),
      ).expect(201);

      expect(response.headers.location).toBe(
        `/api/v1/employees/${response.body.id}`,
      );
      expect(response.headers.etag).toBe('"1"');
      expect(response.body).toMatchObject({
        employeeCode: nextEmployeeCode(highest.rows[0]?.code ?? null),
        firstName: 'Kavya',
        status: 'active',
        fte: '1.00',
        gender: 'female',
        manager: { employeeCode: 'ACME-000001', name: 'Aarav Mehta' },
        pay: { compaRatio: 1, bandPosition: 'within' },
        version: 1,
      });
    });

    it('starts the salary history with a hire record on the hire date, and audits it', async () => {
      const created = await create(
        kavya({ firstName: 'Ravi', workEmail: 'ravi.iyer@acme.test' }),
      ).expect(201);
      const id: string = created.body.id;

      const history = await request(app.getHttpServer())
        .get(`/api/v1/employees/${id}/salary-history`)
        .set('x-acting-role', 'hr_manager')
        .expect(200);
      const audit = await pglite.query(
        'select action, request_id from audit_events where entity_id = $1',
        [id],
      );

      expect(history.body).toMatchObject([
        {
          salary: inr(2_000_000),
          effectiveFrom: '2026-11-02',
          effectiveTo: null,
          reason: 'hire',
        },
      ]);
      expect(audit.rows).toEqual([
        { action: 'employee.created', request_id: 'req-create-1' },
      ]);
    });

    it('answers 409 when someone already has the work email, in any letter case', async () => {
      const response = await create(
        kavya({ workEmail: 'Aarav.Mehta@ACME.test' }),
      ).expect(409);

      expect(response.body.detail).toBe('Someone already has this work email.');
    });

    it('points at every reference that does not exist with 400', async () => {
      const response = await create(
        kavya({
          workEmail: 'nobody@acme.test',
          countryCode: 'FR',
          departmentCode: 'OPS',
          jobFamilyCode: 'LAW',
          levelCode: 'IC6',
          managerId: '00000000-0000-4000-8000-000000000000',
        }),
      ).expect(400);

      expect(
        response.body.errors.map((error: { path: string }) => error.path),
      ).toEqual([
        'countryCode',
        'departmentCode',
        'jobFamilyCode',
        'levelCode',
        'managerId',
      ]);
    });

    it('refuses a manager who has left', async () => {
      const response = await create(
        kavya({
          workEmail: 'nobody@acme.test',
          managerId: await idOf('ACME-000008'),
        }),
      ).expect(400);

      expect(response.body.errors).toEqual([
        {
          path: 'managerId',
          message: 'There is no current employee with this id',
        },
      ]);
    });

    it('answers 422 and writes nothing when the salary is not in the country’s currency', async () => {
      const before = await headCount();

      const response = await create(
        kavya({
          workEmail: 'nobody@acme.test',
          salary: {
            amount: { amountMinor: '2500000', currency: 'USD' },
            frequency: 'annual',
          },
        }),
      ).expect(422);

      expect(response.body.code).toBe('salary_currency_not_country_currency');
      expect(await headCount()).toBe(before);
    });

    it('is for HR managers: viewers get 403', async () => {
      await create(kavya({ workEmail: 'nobody@acme.test' }), 'viewer').expect(
        403,
      );
    });
  });

  // Each test edits a different person, so none depends on another's version bump.
  describe('PATCH /employees/:id', () => {
    /** `ifMatch: null` sends no If-Match header at all. */
    const edit = (id: string, body: object, ifMatch: string | null = '"1"') => {
      const call = request(app.getHttpServer())
        .patch(`/api/v1/employees/${id}`)
        .set('x-acting-role', 'hr_manager')
        .set('x-request-id', 'req-edit-1')
        .send(body);
      return ifMatch === null ? call : call.set('If-Match', ifMatch);
    };

    it('moves a person to another department and title, and bumps the version', async () => {
      // Olivia Brown: Sales, Account Executive.
      const response = await edit(await idOf('ACME-000007'), {
        departmentCode: 'ENG',
        jobTitle: 'Solutions Engineer',
      }).expect(200);

      expect(response.headers.etag).toBe('"2"');
      expect(response.body).toMatchObject({
        department: { code: 'ENG', name: 'Engineering' },
        jobTitle: 'Solutions Engineer',
        version: 2,
      });
    });

    it('audits only the fields that changed, before and after', async () => {
      // Oliver Taylor: Account Executive, full time. The title stays the same.
      await edit(await idOf('ACME-000010'), {
        jobTitle: 'Account Executive',
        fte: '0.8',
      }).expect(200);

      const audit = await pglite.query(
        `select action, before, after, request_id from audit_events
         where entity_id = $1`,
        [await idOf('ACME-000010')],
      );

      expect(audit.rows).toEqual([
        {
          action: 'employee.updated',
          before: { fte: '1' },
          after: { fte: '0.8' },
          request_id: 'req-edit-1',
        },
      ]);
    });

    it('keeps the version and writes no audit event when nothing changes', async () => {
      // George Evans is already a Software Engineer.
      const response = await edit(await idOf('ACME-000012'), {
        jobTitle: 'Software Engineer',
      }).expect(200);
      const audit = await pglite.query(
        'select 1 from audit_events where entity_id = $1',
        [await idOf('ACME-000012')],
      );

      expect(response.body.version).toBe(1);
      expect(audit.rows).toEqual([]);
    });

    it('answers 409 to an edit made on a version someone else has changed since', async () => {
      await edit(await idOf('ACME-000009'), {
        jobTitle: 'Staff Engineer',
      }).expect(200);

      const response = await edit(await idOf('ACME-000009'), {
        jobTitle: 'Principal Engineer',
      }).expect(409);

      expect(response.body.detail).toBe(
        'This record changed since you opened it. Reload to continue.',
      );
    });

    it('answers 428 without If-Match', async () => {
      await edit(
        await idOf('ACME-000011'),
        { jobTitle: 'Staff Engineer' },
        null,
      ).expect(428);
    });

    it('refuses a manager who reports to the person, with 422', async () => {
      // Emma Johnson reports to Liam Smith, so Liam cannot report to Emma.
      const response = await edit(await idOf('ACME-000006'), {
        managerId: await idOf('ACME-000005'),
      }).expect(422);

      expect(response.body.code).toBe('reporting_cycle');
    });

    it('answers 409 when the new work email belongs to someone else', async () => {
      const response = await edit(await idOf('ACME-000004'), {
        workEmail: 'amelia.wilson@acme.test',
      }).expect(409);

      expect(response.body.detail).toBe('Someone already has this work email.');
    });

    it('points at a level that does not exist with 400', async () => {
      const response = await edit(await idOf('ACME-000003'), {
        levelCode: 'M4',
      }).expect(400);

      expect(response.body.errors).toEqual([
        { path: 'levelCode', message: 'There is no level with this code' },
      ]);
    });

    it('answers 404 for someone who does not exist', async () => {
      await request(app.getHttpServer())
        .patch('/api/v1/employees/00000000-0000-4000-8000-000000000000')
        .set('x-acting-role', 'hr_manager')
        .set('If-Match', '"1"')
        .send({ jobTitle: 'Ghost' })
        .expect(404);
    });
  });

  describe('POST /employees/:id/status', () => {
    let hires = 0;
    /** A fresh person (hired 2026-11-02, salary open since then) at version 1. */
    async function hire(): Promise<string> {
      hires += 1;
      const response = await create(
        kavya({ workEmail: `status.${hires}@acme.test` }),
      ).expect(201);
      return response.body.id;
    }

    const changeStatus = (id: string, body: object, ifMatch = '"1"') =>
      request(app.getHttpServer())
        .post(`/api/v1/employees/${id}/status`)
        .set('x-acting-role', 'hr_manager')
        .set('x-request-id', 'req-status-1')
        .set('If-Match', ifMatch)
        .send(body);

    it('terminates a person and closes their salary on the termination date', async () => {
      const id = await hire();

      const response = await changeStatus(id, {
        status: 'terminated',
        effectiveDate: '2026-12-31',
      }).expect(200);
      const history = await request(app.getHttpServer())
        .get(`/api/v1/employees/${id}/salary-history`)
        .set('x-acting-role', 'hr_manager')
        .expect(200);

      expect(response.headers.etag).toBe('"2"');
      expect(response.body).toMatchObject({
        status: 'terminated',
        terminationDate: '2026-12-31',
        version: 2,
      });
      expect(history.body).toMatchObject([
        { effectiveFrom: '2026-11-02', effectiveTo: '2026-12-31' },
      ]);
    });

    it('sends a person on leave, leaves the salary open and audits it', async () => {
      const id = await hire();

      await changeStatus(id, {
        status: 'on_leave',
        effectiveDate: '2026-12-01',
      }).expect(200);
      const audit = await pglite.query(
        `select before, after, request_id from audit_events
         where entity_id = $1 and action = 'employee.status_changed'`,
        [id],
      );
      const open = await pglite.query(
        'select 1 from salary_records where employee_id = $1 and effective_to is null',
        [id],
      );

      expect(audit.rows).toEqual([
        {
          before: { status: 'active', terminationDate: null },
          after: {
            status: 'on_leave',
            effectiveDate: '2026-12-01',
            terminationDate: null,
            closedSalaryRecordId: null,
          },
          request_id: 'req-status-1',
        },
      ]);
      expect(open.rows).toHaveLength(1);
    });

    it('refuses to bring back someone who has left, with 422', async () => {
      // Noah Davis left at the end of 2025.
      const response = await changeStatus(await idOf('ACME-000008'), {
        status: 'active',
        effectiveDate: '2026-12-01',
      }).expect(422);

      expect(response.body.code).toBe('employee_terminated');
    });

    it('refuses a termination on the day the current salary started, with 422', async () => {
      const id = await hire();

      const response = await changeStatus(id, {
        status: 'terminated',
        effectiveDate: '2026-11-02',
      }).expect(422);

      expect(response.body.code).toBe('termination_before_current_salary');
    });

    it('answers 409 to a change made on an old version', async () => {
      const id = await hire();
      await changeStatus(id, {
        status: 'on_leave',
        effectiveDate: '2026-12-01',
      }).expect(200);

      await changeStatus(id, {
        status: 'active',
        effectiveDate: '2027-01-04',
      }).expect(409);
    });

    it('is for HR managers: viewers get 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/employees/${await idOf('ACME-000001')}/status`)
        .set('x-acting-role', 'viewer')
        .set('If-Match', '"1"')
        .send({ status: 'on_leave', effectiveDate: '2026-12-01' })
        .expect(403);
    });
  });
});
