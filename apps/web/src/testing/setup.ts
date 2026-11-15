// Adds Testing Library's DOM matchers (toBeInTheDocument, toHaveAttribute …) to Vitest.
import '@testing-library/jest-dom/vitest';
import { server } from './msw';

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
