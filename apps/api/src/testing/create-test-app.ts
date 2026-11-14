import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { drizzle } from 'drizzle-orm/node-postgres';
import { AppModule } from '../app.module.js';
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
    .compile();
  const app = configureApp(moduleRef.createNestApplication(), {
    docs: options.docs ?? false,
  });
  await app.init();
  return app;
}
