import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { SalaryChangeResultSchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

// Mini-ACME people each start at version 1 with one open record from 2024-04-01.
describe('POST /api/v1/employees/:id/salary-changes', () => {
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

  const inr = (rupees: number) => ({
    amountMinor: String(rupees * 100),
    currency: 'INR',
  });
  const promotion = {
    effectiveFrom: '2026-04-01',
    amount: inr(3_100_000),
    frequency: 'annual',
    reason: 'promotion',
    note: 'Promotion to Senior Engineer',
  };

  const change = (
    id: string,
    body: object,
    ifMatch?: string,
    role = 'hr_manager',
  ) => {
    const call = request(app.getHttpServer())
      .post(`/api/v1/employees/${id}/salary-changes`)
      .set('x-acting-role', role)
      .set('x-request-id', 'req-change-1')
      .send(body);
    return ifMatch === undefined ? call : call.set('If-Match', ifMatch);
  };

  it('records the change: the new record, today’s pay after it and the next version', async () => {
    const mehta = await idOf('ACME-000001');

    const response = await change(mehta, promotion, '"1"');

    expect(response.status).toBe(201);
    const result = SalaryChangeResultSchema.parse(response.body);
    expect(result.record).toMatchObject({
      effectiveFrom: '2026-04-01',
      effectiveTo: null,
      salary: inr(3_100_000),
      reason: 'promotion',
      note: 'Promotion to Senior Engineer',
    });
    // ₹31,00,000 / ₹30,00,000 mid = 1.0333
    expect(result.pay).toMatchObject({
      compaRatio: 1.0333,
      bandPosition: 'within',
    });
    expect(result.version).toBe(2);
  });

  it('closes the previous record on the day the new one starts', async () => {
    const history = await pglite.query<{ from: string; to: string | null }>(
      `select effective_from::text as from, effective_to::text as to from salary_records s
       join employees e on e.id = s.employee_id
       where e.employee_code = 'ACME-000001' order by effective_from`,
    );

    expect(history.rows).toEqual([
      { from: '2022-04-01', to: '2024-04-01' },
      { from: '2024-04-01', to: '2026-04-01' },
      { from: '2026-04-01', to: null },
    ]);
  });

  it('writes exactly one audit event, with the request id', async () => {
    const events = await pglite.query<{
      action: string;
      request_id: string;
      after: unknown;
    }>(
      `select action, request_id, after from audit_events
       where entity_id = (select id from employees where employee_code = 'ACME-000001')`,
    );

    expect(events.rows).toHaveLength(1);
    expect(events.rows[0]).toMatchObject({
      action: 'salary.changed',
      request_id: 'req-change-1',
      after: {
        inserted: { effectiveFrom: '2026-04-01', salary: inr(3_100_000) },
      },
    });
  });

  it('answers 409 when the record changed since it was loaded', async () => {
    const sharma = await idOf('ACME-000002');
    await change(
      sharma,
      { ...promotion, frequency: 'monthly', amount: inr(160_000) },
      '"1"',
    );

    const stale = await change(
      sharma,
      {
        ...promotion,
        effectiveFrom: '2026-10-01',
        frequency: 'monthly',
        amount: inr(170_000),
      },
      '"1"',
    );

    expect(stale.status).toBe(409);
    expect(stale.body.detail).toBe(
      'This record changed since you opened it. Reload to continue.',
    );
  });

  it('answers 428 when If-Match is missing', async () => {
    const gupta = await idOf('ACME-000003');

    expect((await change(gupta, promotion)).status).toBe(428);
  });

  it('answers 422 with the rule when the date is not after the current salary', async () => {
    const gupta = await idOf('ACME-000003');

    const response = await change(
      gupta,
      { ...promotion, effectiveFrom: '2024-01-01' },
      '"1"',
    );

    expect(response.status).toBe(422);
    expect(response.body.code).toBe('effective_date_not_after_current');
  });

  it('answers 400 for an invalid body', async () => {
    const gupta = await idOf('ACME-000003');

    const response = await change(
      gupta,
      { ...promotion, reason: 'hire' },
      '"1"',
    );

    expect(response.status).toBe(400);
    expect(response.body.errors[0].path).toBe('reason');
  });

  it('is refused to viewers', async () => {
    const gupta = await idOf('ACME-000003');

    expect((await change(gupta, promotion, '"1"', 'viewer')).status).toBe(403);
  });
});
