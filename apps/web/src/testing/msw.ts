import { setupServer } from 'msw/node';

/**
 * The fake API every component test talks to (frontend.md → tests). It starts with no
 * handlers; each spec adds the responses it needs with `server.use(...)`. A request nobody
 * answers fails the test, so a component can never silently reach a real network.
 */
export const server = setupServer();
