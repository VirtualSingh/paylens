import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { AuditPageSchema } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { DEMO_USERS } from '../auth/demo-users.js';
import { createTestApp } from '../testing/create-test-app.js';

// Three real changes through the API, then the audit log is read back.
describe('audit log', () => {
  let pglite: PGlite;
  let app: INestApplication;
  let mehta: string;
  let sharma: string;

  async function idOf(code: string): Promise<string> {
    const result = await pglite.query<{ id: string }>(
      'select id from employees where employee_code = $1',
      [code],
    );
    return result.rows[0]?.id ?? '';
  }

  const as = (role: string, path: string) =>
    request(app.getHttpServer())
      .get(`/api/v1${path}`)
      .set('x-acting-role', role);

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
    });
    mehta = await idOf('ACME-000001');
    sharma = await idOf('ACME-000002');

    const change = (path: string, requestId: string, ifMatch: string) =>
      request(app.getHttpServer())
        .post(`/api/v1/employees/${path}`)
        .set('x-acting-role', 'hr_manager')
        .set('x-request-id', requestId)
        .set('If-Match', ifMatch);
    await change(`${mehta}/salary-changes`, 'req-audit-1', '"1"')
      .send({
        effectiveFrom: '2026-04-01',
        amount: { amountMinor: '310000000', currency: 'INR' },
        frequency: 'annual',
        reason: 'promotion',
      })
      .expect(201);
    await request(app.getHttpServer())
      .patch(`/api/v1/employees/${sharma}`)
      .set('x-acting-role', 'hr_manager')
      .set('x-request-id', 'req-audit-2')
      .set('If-Match', '"1"')
      .send({ jobTitle: 'Senior Software Engineer' })
      .expect(200);
    await change(`${sharma}/status`, 'req-audit-3', '"2"')
      .send({ status: 'on_leave', effectiveDate: '2026-12-01' })
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  describe('GET /employees/:id/audit', () => {
    it('lists one person’s events, newest first', async () => {
      const response = await as(
        'hr_manager',
        `/employees/${sharma}/audit`,
      ).expect(200);
      const page = AuditPageSchema.parse(response.body);

      expect(page.total).toBe(2);
      expect(
        page.data.map(({ action, requestId }) => [action, requestId]),
      ).toEqual([
        ['employee.status_changed', 'req-audit-3'],
        ['employee.updated', 'req-audit-2'],
      ]);
      expect(page.data[1]).toMatchObject({
        entityType: 'employee',
        entityId: sharma,
        // Sign-in is off in tests: the change was made as the demo HR manager (ADR-014).
        actor: { id: DEMO_USERS.hr_manager.id, displayName: 'Demo HR manager' },
        before: { jobTitle: 'Software Engineer' },
        after: { jobTitle: 'Senior Software Engineer' },
      });
    });

    it('answers 404 for someone who does not exist', async () => {
      await as(
        'hr_manager',
        '/employees/00000000-0000-4000-8000-000000000000/audit',
      ).expect(404);
    });
  });

  describe('GET /audit', () => {
    it('filters the whole log by action', async () => {
      const response = await as('admin', '/audit?action=salary.changed').expect(
        200,
      );

      expect(response.body).toMatchObject({
        total: 1,
        data: [{ entityId: mehta, requestId: 'req-audit-1' }],
      });
    });

    it('filters by entity and by date', async () => {
      const bySharma = await as(
        'hr_manager',
        `/audit?entityId=${sharma}`,
      ).expect(200);
      const beforeAnything = await as(
        'hr_manager',
        '/audit?to=2000-01-01',
      ).expect(200);

      expect(bySharma.body.total).toBe(2);
      expect(beforeAnything.body).toMatchObject({ total: 0, data: [] });
    });

    it('rejects an unknown filter value with 400', async () => {
      await as('hr_manager', '/audit?action=DROP').expect(400);
    });
  });

  it('is for HR managers: viewers get 403 on both', async () => {
    await as('viewer', '/audit').expect(403);
    await as('viewer', `/employees/${sharma}/audit`).expect(403);
  });
});
