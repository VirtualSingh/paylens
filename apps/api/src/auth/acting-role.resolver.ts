import { ACTING_ROLE_HEADER, USER_ROLES } from '@paylens/shared';
import type { Request } from 'express';
import { type AuthenticatedUser, UserResolver } from './authenticated-user.js';
import { DEFAULT_ACTING_ROLE, DEMO_USERS } from './demo-users.js';

/**
 * Sign-in off (ADR-014): every request is one of the demo users. The role comes from the
 * `x-acting-role` header ("Viewing as" in the web app); without one, the HR manager. Roles,
 * masking and the audit trail work exactly as with sign-in on.
 */
export class ActingRoleResolver extends UserResolver {
  resolve(request: Pick<Request, 'header'>): Promise<AuthenticatedUser> {
    const asked = request.header(ACTING_ROLE_HEADER);
    const role =
      USER_ROLES.find((candidate) => candidate === asked) ??
      DEFAULT_ACTING_ROLE;
    return Promise.resolve({ id: DEMO_USERS[role].id, role, isDemo: true });
  }
}
