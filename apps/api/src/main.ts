import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api');
  await app.listen(process.env.PORT ?? 3000);
}

// NestJS 12 is ESM-only; top-level await is what `nest new` generates in v12.
await bootstrap();
