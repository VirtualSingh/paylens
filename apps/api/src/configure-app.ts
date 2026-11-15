import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';

/** Every route lives under this path (api.md → base path); links to resources start here. */
export const API_PREFIX = 'api/v1';

export interface AppOptions {
  /** Serve OpenAPI at /api/docs (UI) and /api/docs-json. Off in production unless DOCS_PUBLIC. */
  readonly docs: boolean;
}

/**
 * Everything applied to the Nest application outside the module graph. `main.ts` and the
 * API tests both call this, so tests exercise exactly what production runs.
 */
export function configureApp(
  app: INestApplication,
  options: AppOptions,
): INestApplication {
  app.use(requestIdMiddleware);
  app.use(
    // Helmet's defaults (HSTS, nosniff, no x-powered-by, CSP default-src 'self'), tightened
    // per security.md: nobody may frame us, and styles may not be inline either.
    helmet({
      contentSecurityPolicy: {
        directives: {
          frameAncestors: ["'none'"],
          styleSrc: ["'self'"],
        },
      },
      frameguard: { action: 'deny' },
    }),
  );
  app.setGlobalPrefix(API_PREFIX);
  app.useGlobalFilters(new ProblemDetailsFilter());

  if (options.docs) {
    const config = new DocumentBuilder()
      .setTitle('PayLens API')
      .setDescription('Employee salary management for ACME')
      .setVersion('1')
      .build();
    SwaggerModule.setup('api/docs', app, () =>
      SwaggerModule.createDocument(app, config),
    );
  }
  return app;
}
