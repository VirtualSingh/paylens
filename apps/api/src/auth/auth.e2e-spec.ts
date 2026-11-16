import { createHash } from 'node:crypto';
import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';
import { DEMO_USERS } from './demo-users.js';

const CLIENT_ID = '1-test.apps.googleusercontent.com';

describe('sign-in off (the default, ADR-014)', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      auth: { authEnabled: false, googleClientId: CLIENT_ID },
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  it('tells the web app that nobody needs to sign in', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/config')
      .expect(200);

    expect(response.body).toEqual({
      authEnabled: false,
      googleClientId: CLIENT_ID,
    });
  });

  it('acts as the demo HR manager when no role is chosen', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .expect(200);

    expect(response.body).toEqual({
      id: DEMO_USERS.hr_manager.id,
      email: 'demo.hr@paylens.app',
      displayName: 'Demo HR manager',
      role: 'hr_manager',
      isDemo: true,
    });
  });

  it('acts as the demo user of the role chosen in x-acting-role', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('x-acting-role', 'viewer')
      .expect(200);

    expect(response.body).toMatchObject({
      displayName: 'Demo viewer',
      role: 'viewer',
    });
  });

  it('records the demo user as the actor of a change, in the audit log', async () => {
    const id = (
      await pglite.query<{ id: string }>(
        "select id from employees where employee_code = 'ACME-000002'",
      )
    ).rows[0]?.id;
    await request(app.getHttpServer())
      .patch(`/api/v1/employees/${id}`)
      .set('If-Match', '"1"')
      .send({ jobTitle: 'Senior Software Engineer' })
      .expect(200);

    const audit = await request(app.getHttpServer())
      .get(`/api/v1/employees/${id}/audit`)
      .expect(200);

    expect(audit.body.data[0].actor).toEqual({
      id: DEMO_USERS.hr_manager.id,
      displayName: 'Demo HR manager',
    });
  });
});

describe('sign-in on', () => {
  let pglite: PGlite;
  let app: INestApplication;

  /** A session for a demo user straight in the table, as sign-in would leave it. */
  async function sessionFor(
    userId: string,
    expiresAt: string,
    revoked = false,
  ): Promise<string> {
    const token = `token-${Math.random().toString(36).slice(2)}`;
    await pglite.query(
      `insert into sessions (user_id, token_hash, expires_at, revoked_at)
       values ($1, $2, $3, $4)`,
      [
        userId,
        createHash('sha256').update(token).digest('hex'),
        expiresAt,
        revoked ? new Date().toISOString() : null,
      ],
    );
    return `__Host-pl_session=${token}`;
  }

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      auth: { authEnabled: true, googleClientId: CLIENT_ID },
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  it('tells the web app that people must sign in', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/auth/config')
      .expect(200);

    expect(response.body.authEnabled).toBe(true);
  });

  it('answers 401 without a session, whatever role the request claims', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('x-acting-role', 'admin')
      .expect(401);
  });

  it('knows who is signed in from the session cookie', async () => {
    const cookie = await sessionFor(
      DEMO_USERS.admin.id,
      '2999-01-01T00:00:00Z',
    );

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(me.body).toMatchObject({ displayName: 'Demo admin', role: 'admin' });
  });

  it.each([
    ['an expired session', '2000-01-01T00:00:00Z', false],
    ['a revoked session', '2999-01-01T00:00:00Z', true],
  ])('refuses %s', async (_case, expiresAt, revoked) => {
    const cookie = await sessionFor(DEMO_USERS.admin.id, expiresAt, revoked);

    await request(app.getHttpServer())
      .get('/api/v1/employees')
      .set('Cookie', cookie)
      .expect(401);
  });
});
