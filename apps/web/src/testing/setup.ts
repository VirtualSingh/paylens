// Adds Testing Library's DOM matchers (toBeInTheDocument, toHaveAttribute …) to Vitest.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { server } from './msw';

// `findBy…` waits 1 s by default. With lint and typecheck on the same CPU (pre-commit hook,
// CI) a page's first render and fetch took 4–5 s, so waits get 10 s. A missing element still
// fails; it just takes longer to say so.
configure({ asyncUtilTimeout: 10_000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
