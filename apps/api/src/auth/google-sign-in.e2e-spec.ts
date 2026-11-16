import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';
import type { AuthSettings } from './auth-settings.js';
import {
  type GoogleIdentity,
  GoogleTokenVerifier,
} from './google-token-verifier.js';

/** Stands in for Google: each known token maps to an identity, anything else is refused. */
class FakeGoogle extends GoogleTokenVerifier {
  constructor(private readonly identities: Record<string, GoogleIdentity>) {
    super();
  }

  verify(idToken: string): Promise<GoogleIdentity> {
    const identity = this.identities[idToken];
    return identity === undefined
      ? Promise.reject(new Error('Invalid token signature'))
      : Promise.resolve(identity);
  }
}

const google = new FakeGoogle({
  'token-admin': {
    sub: 'google-1',
    email: 'Owner@Example.com',
    emailVerified: true,
    name: 'The Owner',
  },
  'token-colleague': {
    sub: 'google-2',
    email: 'colleague@acme.test',
    emailVerified: true,
    name: 'A Colleague',
  },
  'token-unverified': {
    sub: 'google-3',
    email: 'someone@acme.test',
    emailVerified: false,
    name: 'Unverified',
  },
  'token-stranger': {
    sub: 'google-4',
    email: 'stranger@elsewhere.test',
    emailVerified: true,
    name: 'A Stranger',
  },
});

const signInOn: AuthSettings = {
  authEnabled: true,
  googleClientId: '1-test.apps.googleusercontent.com',
  adminEmails: ['owner@example.com'],
  allowedEmailDomains: ['acme.test'],
  sessionTtlHours: 12,
};

describe('Google sign-in (sign-in on)', () => {
  let pglite: PGlite;
  let app: INestApplication;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    app = await createTestApp({
      database: drizzle(pglite),
      auth: signInOn,
      googleVerifier: google,
    });
  });

  afterAll(async () => {
    await app.close();
    await pglite.close();
  });

  const signIn = (idToken: string) =>
    request(app.getHttpServer()).post('/api/v1/auth/google').send({ idToken });

  it('signs in an admin email and sets an httpOnly, secure session cookie', async () => {
    const response = await signIn('token-admin').expect(200);

    expect(response.body).toMatchObject({
      email: 'owner@example.com',
      displayName: 'The Owner',
      role: 'admin',
      isDemo: false,
    });
    const cookie = String(response.headers['set-cookie']);
    expect(cookie).toMatch(/^__Host-pl_session=[\w-]{40,};/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('Secure');
    expect(cookie).toContain('SameSite=Lax');
    expect(cookie).toContain('Path=/');
  });

  it('lets an allowed domain in as a viewer, and knows them on the next request', async () => {
    const signedIn = await signIn('token-colleague').expect(200);
    const cookie = String(signedIn.headers['set-cookie']).split(';')[0] ?? '';

    const me = await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(me.body).toMatchObject({
      email: 'colleague@acme.test',
      role: 'viewer',
    });
  });

  it.each([
    ['a token Google does not vouch for', 'token-forged', 401],
    ['an email Google has not verified', 'token-unverified', 401],
    ['an account from outside the allowed domains', 'token-stranger', 403],
  ])('refuses %s', async (_case, idToken, status) => {
    await signIn(idToken).expect(status);
  });

  it('signs out: the session stops working at once', async () => {
    const signedIn = await signIn('token-admin').expect(200);
    const cookie = String(signedIn.headers['set-cookie']).split(';')[0] ?? '';

    const out = await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Cookie', cookie)
      .expect(204);

    expect(String(out.headers['set-cookie'])).toContain('Max-Age=0');
    await request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Cookie', cookie)
      .expect(401);
  });
});

describe('Google sign-in while sign-in is off', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await createTestApp({ googleVerifier: google });
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not exist', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/google')
      .send({ idToken: 'token-admin' })
      .expect(404);
  });
});
