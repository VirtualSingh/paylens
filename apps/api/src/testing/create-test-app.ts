import type { INestApplication, Type } from '@nestjs/common';
import type { IsoDate } from '@paylens/domain';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppModule } from '../app.module.js';
import { AUTH_SETTINGS, type AuthSettings } from '../auth/auth-settings.js';
import { Clock, FixedClock } from '../common/clock.js';
import { configureApp } from '../configure-app.js';
import { type Database, DATABASE } from '../db/database.js';

export interface TestAppOptions {
  /** Extra controllers mounted next to the real ones, e.g. a route that throws on purpose. */
  readonly controllers?: Type<unknown>[];
  /** Serve OpenAPI docs; off by default, as in production. */
  readonly docs?: boolean;
  /**
   * The database behind DATABASE, usually `drizzle(await createTestDatabase())`. Tests that
   * do not touch the database get Drizzle's mock, which has no connection at all.
   */
  readonly database?: Database;
  /** "Today" for the app's Clock; defaults to a fixed 2026-11-14 so tests never drift. */
  readonly today?: IsoDate;
  /** The sign-in mode; defaults to off (acting roles), whatever the environment says. */
  readonly auth?: AuthSettings;
}

/** The real AppModule with the production configuration, ready for supertest. */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  })
    .overrideProvider(DATABASE)
    .useValue(options.database ?? drizzle.mock())
    .overrideProvider(Clock)
    .useValue(new FixedClock(options.today ?? '2026-11-14'))
    .overrideProvider(AUTH_SETTINGS)
    .useValue(options.auth ?? { authEnabled: false, googleClientId: null })
    .compile();
  const app = configureApp(moduleRef.createNestApplication(), {
    docs: options.docs ?? false,
  });
  await app.init();
  return app;
}
