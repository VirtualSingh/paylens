import type { PGlite } from '@electric-sql/pglite';
import type { INestApplication } from '@nestjs/common';
import { hasAtLeast, USER_ROLES, type UserRole } from '@paylens/shared';
import { drizzle } from 'drizzle-orm/pglite';
import request from 'supertest';
import { seedMiniAcme } from '../db/testing/mini-acme.js';
import { createTestDatabase } from '../db/testing/pglite.js';
import { createTestApp } from '../testing/create-test-app.js';

/**
 * Who may call what (security.md → A01): every route × {anonymous, viewer, hr_manager, admin}.
 * Anonymous (sign-in on, no session) → 401; a role below the route's minimum → 403; at or
 * above it → success. Roles act through x-acting-role with sign-in off (ADR-014): the same
 * guard and rules, so the matrix proves both modes.
 * A route missing from this table fails the coverage test below, and a route without
 * @Roles() would answer 403 to everyone, failing its own rows — so nothing is unguarded.
 */
type Minimum = UserRole | 'public';

interface RouteCase {
  /** As the OpenAPI document spells it: "PATCH /api/v1/employees/{id}". */
  readonly route: string;
  readonly minimum: Minimum;
  readonly success: number;
  /** Changes data: needs a fresh person and must write exactly one audit event. */
  readonly mutates: boolean;
  readonly body?: object;
  readonly ifMatch?: boolean;
  /** A query string the route needs, e.g. "?by=country". */
  readonly query?: string;
}

const inr = (rupees: number) => ({
  amountMinor: String(rupees * 100),
  currency: 'INR',
});
const newPerson = (email: string) => ({
  firstName: 'Matrix',
  lastName: 'Person',
  workEmail: email,
  countryCode: 'IN',
  departmentCode: 'ENG',
  jobFamilyCode: 'SWE',
  levelCode: 'IC3',
  jobTitle: 'Software Engineer',
  employmentType: 'full_time',
  hireDate: '2026-11-02',
  gender: 'female',
  salary: { amount: inr(2_000_000), frequency: 'annual' },
});

const ROUTES: readonly RouteCase[] = [
  {
    route: 'GET /api/v1/auth/config',
    minimum: 'public',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/auth/me',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/analytics/summary',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/analytics/breakdown',
    query: '?by=country',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/health',
    minimum: 'public',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/health/ready',
    minimum: 'public',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/employees',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/employees/{id}',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'POST /api/v1/employees',
    minimum: 'hr_manager',
    success: 201,
    mutates: true,
  },
  {
    route: 'PATCH /api/v1/employees/{id}',
    minimum: 'hr_manager',
    success: 200,
    mutates: true,
    body: { jobTitle: 'Staff Engineer' },
    ifMatch: true,
  },
  {
    route: 'POST /api/v1/employees/{id}/status',
    minimum: 'hr_manager',
    success: 200,
    mutates: true,
    body: { status: 'on_leave', effectiveDate: '2026-12-01' },
    ifMatch: true,
  },
  {
    route: 'GET /api/v1/employees/{id}/salary-history',
    minimum: 'hr_manager',
    success: 200,
    mutates: false,
  },
  {
    route: 'POST /api/v1/employees/{id}/salary-changes',
    minimum: 'hr_manager',
    success: 201,
    mutates: true,
    body: {
      effectiveFrom: '2027-01-01',
      amount: inr(2_100_000),
      frequency: 'annual',
      reason: 'merit',
    },
    ifMatch: true,
  },
  {
    route: 'GET /api/v1/employees/{id}/audit',
    minimum: 'hr_manager',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/audit',
    minimum: 'hr_manager',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/countries',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/departments',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/job-families',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/job-levels',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/pay-bands',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
  {
    route: 'GET /api/v1/fx-rates',
    minimum: 'viewer',
    success: 200,
    mutates: false,
  },
];

const CALLERS = ['anonymous', ...USER_ROLES] as const;
type Caller = (typeof CALLERS)[number];

function expectedStatus(route: RouteCase, caller: Caller): number {
  if (route.minimum === 'public') {
    return route.success;
  }
  if (caller === 'anonymous') {
    return 401;
  }
  return hasAtLeast(caller, route.minimum) ? route.success : 403;
}

describe('authorization matrix', () => {
  let pglite: PGlite;
  let app: INestApplication;
  /** The same API with sign-in on: where "anonymous" means nobody signed in. */
  let signInOn: INestApplication;
  let someone: string;
  let people = 0;

  beforeAll(async () => {
    pglite = await createTestDatabase();
    await seedMiniAcme(pglite);
    app = await createTestApp({
      database: drizzle(pglite),
      today: '2026-11-14',
      docs: true,
    });
    signInOn = await createTestApp({
      database: drizzle(pglite),
      auth: { authEnabled: true, googleClientId: null },
    });
    const result = await pglite.query<{ id: string }>(
      "select id from employees where employee_code = 'ACME-000001'",
    );
    someone = result.rows[0]?.id ?? '';
  });

  afterAll(async () => {
    await app.close();
    await signInOn.close();
    await pglite.close();
  });

  /** A person nobody else touches, at version 1, for one change. */
  async function freshPerson(): Promise<string> {
    people += 1;
    const response = await request(app.getHttpServer())
      .post('/api/v1/employees')
      .set('x-acting-role', 'hr_manager')
      .send(newPerson(`matrix.${people}@acme.test`))
      .expect(201);
    return response.body.id;
  }

  const cases = ROUTES.flatMap((route, index) =>
    CALLERS.map((caller) => ({
      name: route.route,
      index,
      route,
      caller,
      expected: expectedStatus(route, caller),
    })),
  );

  it.each(cases)(
    '$name as $caller → $expected',
    async ({ route, index, caller, expected }) => {
      const allowed = expected === route.success;
      const [method = '', template = ''] = route.route.split(' ');
      const id = route.mutates && allowed ? await freshPerson() : someone;
      // Letters, digits, dot, dash and underscore only: the request-id middleware drops others.
      const requestId = `matrix-${index}-${caller}`;

      let call = request(
        (caller === 'anonymous' ? signInOn : app).getHttpServer(),
      )
        [method === 'PATCH' ? 'patch' : method === 'POST' ? 'post' : 'get'](
          template.replace('{id}', id) + (route.query ?? ''),
        )
        .set('x-request-id', requestId);
      if (caller !== 'anonymous') {
        call = call.set('x-acting-role', caller);
      }
      if (route.ifMatch === true) {
        call = call.set('If-Match', '"1"');
      }
      const body =
        route.route === 'POST /api/v1/employees'
          ? newPerson(`matrix.${caller}.${people}@acme.test`)
          : route.body;
      const response = await (body === undefined ? call : call.send(body));

      expect(response.status).toBe(expected);
      if (route.mutates && allowed) {
        const events = await pglite.query(
          'select 1 from audit_events where request_id = $1',
          [requestId],
        );
        expect(events.rows).toHaveLength(1);
      }
    },
  );

  it('covers every route the API serves', async () => {
    const document = (await request(app.getHttpServer()).get('/api/docs-json'))
      .body as { paths: Record<string, Record<string, unknown>> };
    const served = Object.entries(document.paths).flatMap(
      ([path, operations]) =>
        Object.keys(operations).map(
          (method) => `${method.toUpperCase()} ${path}`,
        ),
    );

    // Signing in and out are public by nature and have their own spec (google-sign-in).
    const signInItself = [
      'POST /api/v1/auth/google',
      'POST /api/v1/auth/logout',
    ];

    expect(
      served.filter((route) => !signInItself.includes(route)).sort(),
    ).toEqual(ROUTES.map(({ route }) => route).sort());
  });
});
