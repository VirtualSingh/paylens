import {
  createParamDecorator,
  type ExecutionContext,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import type { UserRole } from '@paylens/shared';
import type { Request } from 'express';
import type { AuthenticatedUser } from './authenticated-user.js';

export const PUBLIC_ROUTE = 'paylens:public';
export const MINIMUM_ROLE = 'paylens:minimum-role';

/** Anyone may call this route, signed in or not (health checks, sign-in itself). */
export const Public = () => SetMetadata(PUBLIC_ROUTE, true);

/**
 * The least role allowed on this route; higher roles are allowed too
 * (admin ⊇ hr_manager ⊇ viewer). A route with neither @Roles nor @Public is refused.
 */
export const Roles = (minimum: UserRole) => SetMetadata(MINIMUM_ROLE, minimum);

/** The signed-in user, in a handler: `@CurrentUser() user: AuthenticatedUser`. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<Request>().user;
    if (user === undefined) {
      // Only reachable on a @Public route, where asking for the user is a programming error.
      throw new UnauthorizedException();
    }
    return user;
  },
);
