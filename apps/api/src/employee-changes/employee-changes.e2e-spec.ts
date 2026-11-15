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

  describe('POST /employees', () => {
    const create = (body: object, role = 'hr_manager') =>
      request(app.getHttpServer())
        .post('/api/v1/employees')
        .set('x-dev-role', role)
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
        .set('x-dev-role', 'hr_manager')
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
});
