// Adds Testing Library's DOM matchers (toBeInTheDocument, toHaveAttribute …) to Vitest.
import '@testing-library/jest-dom/vitest';
import { configure } from '@testing-library/react';
import { lookupHandlers } from './fixtures';
import { server } from './msw';

// `findBy…` waits 1 s by default. With lint and typecheck on the same CPU (pre-commit hook,
// CI) a page's first render and fetch took 4–5 s, so waits get 10 s. A missing element still
// fails; it just takes longer to say so.
configure({ asyncUtilTimeout: 10_000 });

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
// Registered first, so a spec's own server.use(...) answers ahead of them.
beforeEach(() => server.use(...lookupHandlers));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

// cmdk (the ⌘K palette) measures and scrolls its list; jsdom has neither API.
globalThis.ResizeObserver ??= class {
  observe(): void {
    // jsdom has no layout, so there is nothing to observe.
  }
  unobserve(): void {
    // As above.
  }
  disconnect(): void {
    // As above.
  }
};
Element.prototype.scrollIntoView ??= function scrollIntoView(): void {
  // jsdom does not scroll; cmdk only calls this to keep the active item in view.
};

// jsdom has no layout, so charts are not drawn in component tests; what they show is tested
// as pure functions (e.g. features/people/salary-history-chart.spec.tsx).
vi.mock('../components/echart', () => ({ default: () => null }));
