import { createApp } from './create-app.js';

async function bootstrap(): Promise<void> {
  const app = await createApp();
  await app.listen(process.env.PORT ?? 3000);
}

// NestJS 12 is ESM-only; top-level await is what `nest new` generates in v12.
await bootstrap();
