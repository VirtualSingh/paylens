import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { EmployeeProfileSchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

describe('GET /api/v1/employees/:id', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({ database: drizzle(pglite) });
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
    const id = result.rows[0]?.id;
    if (!id) throw new Error(`no employee ${code}`);
    return id;
  }

  const profile = (id: string, role = 'hr_manager') =>
    request(app.getHttpServer())
      .get(`/api/v1/employees/${id}`)
      .set('x-dev-role', role);

  it('shows an HR manager the full profile with current pay', async () => {
    const response = await profile(await idOf('ACME-000001'));

    expect(response.status).toBe(200);
    expect(EmployeeProfileSchema.parse(response.body)).toMatchObject({
      employeeCode: 'ACME-000001',
      jobFamily: { code: 'SWE', name: 'Software' },
      employmentType: 'full_time',
      fte: '1.00',
      gender: 'male',
      manager: null,
      version: 1,
      pay: { compaRatio: 0.95, bandPosition: 'within' },
    });
  });

  it('names the manager', async () => {
    const response = await profile(await idOf('ACME-000005'));

    expect(response.body.manager).toEqual({
      id: await idOf('ACME-000006'),
      employeeCode: 'ACME-000006',
      name: 'Liam Smith',
    });
  });

  it('sends the version as an ETag, for If-Match on changes', async () => {
    const response = await profile(await idOf('ACME-000001'));

    expect(response.headers.etag).toBe('"1"');
  });

  it('shows a viewer neither pay nor gender', async () => {
    const response = await profile(await idOf('ACME-000001'), 'viewer');

    expect(response.status).toBe(200);
    expect(response.body).not.toHaveProperty('pay');
    expect(response.body).not.toHaveProperty('gender');
  });

  it('answers 404 for someone who does not exist', async () => {
    const response = await profile('00000000-0000-4000-8000-000000000000');

    expect(response.status).toBe(404);
    expect(response.headers['content-type']).toMatch(/problem\+json/);
  });

  it('answers 400 when the id is not a UUID', async () => {
    expect((await profile('ACME-000001')).status).toBe(400);
  });
});
