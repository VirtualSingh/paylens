import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';

async function bootstrap(): Promise<void> {
  const app = configureApp(await NestFactory.create(AppModule), {
    docs:
      process.env.NODE_ENV !== 'production' ||
      process.env.DOCS_PUBLIC === 'true',
  });
  await app.listen(process.env.PORT ?? 3000);
}

// NestJS 12 is ESM-only; top-level await is what `nest new` generates in v12.
await bootstrap();
