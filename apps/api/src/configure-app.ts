import type { INestApplication } from '@nestjs/common';

/**
 * Everything applied to the Nest application outside the module graph. `main.ts` and the
 * API tests both call this, so tests exercise exactly what production runs.
 */
export function configureApp(app: INestApplication): INestApplication {
  app.setGlobalPrefix('api/v1');
  return app;
}
