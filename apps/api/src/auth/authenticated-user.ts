import type { UserRole } from '@paylens/shared';
import type { Request } from 'express';

/** The person behind a request, as far as authorization needs to know. */
export interface AuthenticatedUser {
  /** users.id; null for the Phase-1 dev header, which has no user row behind it. */
  readonly id: string | null;
  readonly role: UserRole;
  readonly isDemo: boolean;
}

// The access guard stores the resolved user on the request for handlers and the audit log.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express's types are a global namespace
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Turns a request into a user, or null when nobody is signed in. Phase 1 uses a dev header;
 * Phase 2 replaces the provider with session cookies — the guard does not change.
 */
export abstract class UserResolver {
  abstract resolve(
    request: Pick<Request, 'header'>,
  ): Promise<AuthenticatedUser | null>;
}
