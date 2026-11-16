import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { SalaryHistorySchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

describe('GET /api/v1/employees/:id/salary-history', () => {
  let pglite: PGlite;
  let app: INestApplication;
  let mehta: string;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({ database: drizzle(pglite) });
    const result = await pglite.query<{ id: string }>(
      "select id from employees where employee_code = 'ACME-000001'",
    );
    mehta = result.rows[0]?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  const history = (id: string, role = 'hr_manager') =>
    request(app.getHttpServer())
      .get(`/api/v1/employees/${id}/salary-history`)
      .set('x-acting-role', role);

  it('lists every salary record, newest first', async () => {
    const response = await history(mehta);

    expect(response.status).toBe(200);
    const records = SalaryHistorySchema.parse(response.body);
    expect(
      records.map((r) => [
        r.effectiveFrom,
        r.effectiveTo,
        r.salary.amountMinor,
        r.reason,
      ]),
    ).toEqual([
      ['2024-04-01', null, '285000000', 'merit'],
      ['2022-04-01', '2024-04-01', '250000000', 'hire'],
    ]);
  });

  it('is for HR managers and admins only', async () => {
    expect((await history(mehta, 'viewer')).status).toBe(403);
  });

  it('answers 404 for someone who does not exist', async () => {
    expect((await history('00000000-0000-4000-8000-000000000000')).status).toBe(
      404,
    );
  });
});
