import { USER_ROLES, type UserRole } from '@paylens/shared';
import type { Request } from 'express';
import { type AuthenticatedUser, UserResolver } from './authenticated-user.js';

/**
 * TEMPORARY (phase-1-domain-data.md → 1.5): until sign-in exists, `x-dev-role: hr_manager`
 * acts as a user with that role, so the API can be built and tested with real authorization.
 * It is inert in production and is replaced by session sign-in in Phase 2.
 */
export class DevRoleHeaderResolver extends UserResolver {
  constructor(private readonly nodeEnv: string | undefined) {
    super();
  }

  resolve(request: Pick<Request, 'header'>): Promise<AuthenticatedUser | null> {
    if (this.nodeEnv === 'production') {
      return Promise.resolve(null);
    }
    const role = USER_ROLES.find(
      (candidate: UserRole) => candidate === request.header('x-dev-role'),
    );
    return Promise.resolve(
      role === undefined ? null : { id: null, role, isDemo: false },
    );
  }
}
