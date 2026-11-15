import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { hasAtLeast, type UserRole } from '@paylens/shared';
import type { Request } from 'express';
import { MINIMUM_ROLE, PUBLIC_ROUTE } from './access.decorators.js';
import { UserResolver } from './authenticated-user.js';

/**
 * Runs before every handler (registered as a global guard). Deny by default (security.md):
 * a route must say who may call it, with @Public() or @Roles(minimum).
 * 401 — nobody is signed in · 403 — signed in, but not allowed here.
 */
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly users: UserResolver,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(PUBLIC_ROUTE, targets)) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const user = await this.users.resolve(request);
    if (user === null) {
      throw new UnauthorizedException('Sign in to continue');
    }
    request.user = user;

    const minimum = this.reflector.getAllAndOverride<UserRole | undefined>(
      MINIMUM_ROLE,
      targets,
    );
    if (minimum === undefined || !hasAtLeast(user.role, minimum)) {
      throw new ForbiddenException("You don't have access to this");
    }
    return true;
  }
}
