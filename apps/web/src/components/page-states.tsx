import type { ReactNode } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router';
import { ApiError } from '../lib/api-client';

/** What is empty or missing, why, and (optionally) one action (ui.md → EmptyState). */
export function EmptyState({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section className="max-w-[720px] py-12">
      <h2 className="text-lg">{title}</h2>
      {children !== undefined && (
        <p className="mt-1 text-muted-foreground">{children}</p>
      )}
      {action !== undefined && <div className="mt-4">{action}</div>}
    </section>
  );
}

/**
 * A failed load, said in words that help (frontend.md → API client contract): 401 → sign in,
 * 403 → no access, 404 → not found; anything else asks to try again with the request id.
 */
export function ErrorState({ error }: { error: unknown }) {
  if (error instanceof ApiError) {
    if (error.status === 401) {
      return (
        <EmptyState title="Sign in to continue">
          Sign-in is not available in this build yet.
        </EmptyState>
      );
    }
    if (error.status === 403) {
      return (
        <EmptyState title="You don't have access to this">
          Ask an admin if you need it.
        </EmptyState>
      );
    }
    if (error.status === 404) {
      return (
        <EmptyState title="Not found">
          It may have been removed, or the link is wrong.
        </EmptyState>
      );
    }
  }
  const requestId =
    error instanceof ApiError ? error.problem.requestId : undefined;
  return (
    <EmptyState title="This could not be loaded">
      Try again in a moment.
      {requestId !== undefined && ` If it keeps failing, quote ${requestId}.`}
    </EmptyState>
  );
}

export function NotFoundPage() {
  return (
    <EmptyState title="Page not found">
      Check the address, or pick a section on the left.
    </EmptyState>
  );
}

/** Shown in place of a route that threw while rendering (frontend.md: a boundary per route). */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />;
  }
  return <ErrorState error={error} />;
}

/** A section planned for a later phase (plan.md), said plainly instead of a blank page. */
export function ComingLater({ section }: { section: string }) {
  return (
    <EmptyState title={section}>
      {section} arrives in a later phase of the build.
    </EmptyState>
  );
}
