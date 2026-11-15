import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

/**
 * The production application, configured but not yet listening. Two entrypoints use it:
 * `main.ts` (a long-running server: local dev, Docker) and `api/index.js` (the Vercel
 * Function, which hands requests to it instead of listening on a port).
 */
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule);
  return configureApp(app, {
    docs:
      process.env.NODE_ENV !== 'production' ||
      process.env.DOCS_PUBLIC === 'true',
  });
}
