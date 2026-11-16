import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';
import { Toaster } from 'sonner';
import { ApiError } from '../lib/api-client';
import { SessionProvider } from '../lib/session';
import { ReportingCurrencyProvider } from '../lib/reporting-currency';

/** Retry network blips and server errors, never a 4xx: asking again will not change it. */
function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        retry: (failures, error) =>
          failures < 2 && !(error instanceof ApiError && error.status < 500),
      },
    },
  });
}

export function AppProviders({
  children,
  queryClient,
}: {
  children: ReactNode;
  /** Tests pass their own (no retries, fresh cache). */
  queryClient?: QueryClient;
}) {
  const [client] = useState(() => queryClient ?? createQueryClient());
  return (
    <QueryClientProvider client={client}>
      <SessionProvider>
        <ReportingCurrencyProvider>
          {children}
          {/* Toasts repeat the verb of the action (ui.md → Feedback); a polite live region. */}
          <Toaster position="bottom-right" />
        </ReportingCurrencyProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
