import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { EmployeeDirectoryPageSchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

describe('GET /api/v1/employees', () => {
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

  const directory = (query: string, role?: string) => {
    const call = request(app.getHttpServer()).get(`/api/v1/employees${query}`);
    return role === undefined ? call : call.set('x-acting-role', role);
  };

  it('lists people with their pay for an HR manager, in the shared contract', async () => {
    const response = await directory('?pageSize=2', 'hr_manager');

    expect(response.status).toBe(200);
    const page = EmployeeDirectoryPageSchema.parse(response.body);
    expect(page).toMatchObject({ page: 1, pageSize: 2, total: 12 });
    expect(page.data[0]).toMatchObject({
      lastName: 'Brown',
      pay: {
        annualReporting: {
          money: { amountMinor: '9500000', currency: 'USD' },
          asOf: '2026-11-14',
        },
        compaRatio: 0.76,
        bandPosition: 'below',
      },
    });
  });

  it('converts into the requested reporting currency', async () => {
    const response = await directory(
      '?q=Mehta&reportingCurrency=GBP',
      'hr_manager',
    );

    // ₹28,50,000 × 0.80 / 83 = £27,469.879… → £27,469.88
    expect(response.body.data[0].pay.annualReporting).toEqual({
      money: { amountMinor: '2746988', currency: 'GBP' },
      asOf: '2026-11-01',
    });
  });

  it('shows a viewer the directory without anyone’s pay', async () => {
    const response = await directory('', 'viewer');

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(12);
    for (const item of response.body.data) {
      expect(item).not.toHaveProperty('pay');
    }
  });

  it('answers 400 naming the field for a sort outside the allowlist', async () => {
    const response = await directory('?sort=salary:desc', 'hr_manager');

    expect(response.status).toBe(400);
    expect(response.body.errors).toEqual([
      { path: 'sort.0.field', message: expect.any(String) },
    ]);
  });
});
