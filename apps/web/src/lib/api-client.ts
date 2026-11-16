import {
  ACTING_ROLE_HEADER,
  type ProblemDetails,
  ProblemDetailsSchema,
} from '@paylens/shared';
import type { z } from 'zod';
import { actingRole } from './acting-role';

/** Same origin: Vite proxies /api in development, Vercel rewrites it in production. */
const API_BASE = '/api/v1';

/** A failed call, carrying the API's problem+json (RFC 9457) so screens can explain it. */
export class ApiError extends Error {
  readonly status: number;

  constructor(readonly problem: ProblemDetails) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiError';
    this.status = problem.status;
  }
}

export interface RequestOptions {
  readonly method?: 'GET' | 'POST' | 'PATCH';
  readonly body?: unknown;
  /** The ETag of the version the user loaded (api.md → Concurrency). */
  readonly ifMatch?: string;
}

/**
 * The only place the web app calls `fetch` (frontend.md → rules). Every answer is checked
 * against the shared Zod schema, so a contract drift fails loudly here instead of as an
 * `undefined` somewhere in a component.
 */
export async function apiRequest<Schema extends z.ZodType>(
  path: string,
  schema: Schema,
  options: RequestOptions = {},
): Promise<{ data: z.output<Schema>; etag: string | null }> {
  const method = options.method ?? 'GET';
  const headers = new Headers({
    Accept: 'application/json',
    'x-request-id': crypto.randomUUID(),
  });
  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }
  if (options.ifMatch !== undefined) {
    headers.set('If-Match', options.ifMatch);
  }
  // Sign-in off: the role to view as. Sign-in on: ignored by the API (ADR-014).
  headers.set(ACTING_ROLE_HEADER, actingRole());

  const response = await fetch(
    new URL(API_BASE + path, window.location.origin),
    {
      method,
      headers,
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    },
  );

  if (!response.ok) {
    throw new ApiError(await problemFrom(response));
  }
  // 204 No Content (sign-out) has no body to read.
  const body: unknown =
    response.status === 204 ? undefined : await response.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new Error(
      `The API answered ${method} ${path} with an unexpected shape`,
    );
  }
  return { data: parsed.data, etag: response.headers.get('ETag') };
}

/** The problem in the body, or one built from the status when the body is not a problem. */
async function problemFrom(response: Response): Promise<ProblemDetails> {
  const body: unknown = await response.json().catch(() => null);
  const problem = ProblemDetailsSchema.safeParse(body);
  if (problem.success) {
    return problem.data;
  }
  return {
    type: 'about:blank',
    title:
      response.statusText === ''
        ? `HTTP ${response.status}`
        : response.statusText,
    status: response.status,
    instance: new URL(response.url || window.location.href).pathname,
  };
}
