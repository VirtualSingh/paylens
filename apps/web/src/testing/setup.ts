// Adds Testing Library's DOM matchers (toBeInTheDocument, toHaveAttribute …) to Vitest.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { server } from './msw';

// `findBy…` waits 1 s by default. A lazy route's first import can take longer while the
// pre-commit hook runs lint and typecheck on the same CPU, which made one run flaky.
configure({ asyncUtilTimeout: 3000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
