import type { INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { requestIdMiddleware } from './common/request-id.middleware.js';

/**
 * Everything applied to the Nest application outside the module graph. `main.ts` and the
 * API tests both call this, so tests exercise exactly what production runs.
 */
export function configureApp(app: INestApplication): INestApplication {
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
  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new ProblemDetailsFilter());
  return app;
}
