import { QueryClient } from '@tanstack/react-query';
import { render, type RenderResult } from '@testing-library/react';
import userEvent, { type UserEvent } from '@testing-library/user-event';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { AppProviders } from '../app/providers';
import { routes } from '../app/routes';
import { lookupHandlers } from './fixtures';
import { server } from './msw';

/**
 * Renders the real app (providers, shell, routes) at `path`, against MSW. Each call gets a
 * fresh query cache, so no test sees another's data.
 */
export type RenderedRoute = RenderResult & {
  readonly user: UserEvent;
  readonly router: ReturnType<typeof createMemoryRouter>;
  readonly queryClient: QueryClient;
};

export function renderRoute(path: string): RenderedRoute {
  server.use(...lookupHandlers);
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  // Every keystroke is still a full key event; `delay: null` only skips the timer between
  // them, which made typing-heavy tests slow under load.
  const user = userEvent.setup({ delay: null });
  const view = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  );
  return { ...view, user, router, queryClient };
}
