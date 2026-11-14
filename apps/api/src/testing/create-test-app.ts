import type { INestApplication, Type } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app.module.js';
import { configureApp } from '../configure-app.js';

export interface TestAppOptions {
  /** Extra controllers mounted next to the real ones, e.g. a route that throws on purpose. */
  readonly controllers?: Type<unknown>[];
}

/** The real AppModule with the production configuration, ready for supertest. */
export async function createTestApp(
  options: TestAppOptions = {},
): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: options.controllers ?? [],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication());
  await app.init();
  return app;
}
