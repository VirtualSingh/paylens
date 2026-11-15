// Vercel Function entrypoint (ADR-011). Vercel runs this plain JavaScript file as it is and
// compiles no TypeScript: every request is served by the NestJS app that our own build
// (`nx run api:build`, tsc → dist/) produced, so production runs exactly what CI tested.
// `src/main.ts` remains the entrypoint for a long-running server (local dev, Docker).
import { createApp } from '../dist/create-app.js';

/** The Express request listener, created on the first request and reused while warm. */
let requestListener;

function getRequestListener() {
  requestListener ??= createApp()
    .then(async (app) => {
      await app.init();
      return app.getHttpAdapter().getInstance();
    })
    .catch((error) => {
      // Do not cache a failed start: the next request tries again.
      requestListener = undefined;
      throw error;
    });
  return requestListener;
}

export default async function handler(request, response) {
  const listener = await getRequestListener();
  listener(request, response);
}
