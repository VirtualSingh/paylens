import type { UserRole } from '@paylens/shared';
import type { Request } from 'express';

/** The person behind a request, as far as authorization needs to know. */
export interface AuthenticatedUser {
  /** users.id: the signed-in user, or a demo user while sign-in is off (ADR-014). */
  readonly id: string;
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
 * Turns a request into a user, or null when nobody is signed in: the session cookie with
 * sign-in on, a demo user of the acting role with it off (ADR-014). The guard does not change.
 */
export abstract class UserResolver {
  abstract resolve(
    request: Pick<Request, 'header'>,
  ): Promise<AuthenticatedUser | null>;
}
