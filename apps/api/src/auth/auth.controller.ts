import {
  Controller,
  Get,
  HttpStatus,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  type AuthConfig,
  AuthConfigSchema,
  type CurrentUser,
  CurrentUserSchema,
} from '@paylens/shared';
import { ApiContract } from '../common/api-contract.js';
import { CurrentUser as Actor, Public, Roles } from './access.decorators.js';
import { AUTH_SETTINGS, type AuthSettings } from './auth-settings.js';
import type { AuthenticatedUser } from './authenticated-user.js';
import { UsersRepository } from './users.repository.js';

@ApiTags('Sign-in')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
    private readonly users: UsersRepository,
  ) {}

  /** Whether people must sign in, so the web app can show sign-in or go straight in. */
  @Get('config')
  @Public()
  @ApiContract({
    summary: 'Whether sign-in is required, and the Google client to use',
    public: true,
    success: {
      status: HttpStatus.OK,
      schema: AuthConfigSchema,
      description: 'The sign-in mode (ADR-014)',
    },
  })
  config(): AuthConfig {
    return {
      authEnabled: this.settings.authEnabled,
      googleClientId: this.settings.googleClientId,
    };
  }

  /** The person this request acts as: a demo user with sign-in off, else the signed-in one. */
  @Get('me')
  @Roles('viewer')
  @ApiContract({
    summary: 'Who the app is acting as',
    success: {
      status: HttpStatus.OK,
      schema: CurrentUserSchema,
      description: 'The current user',
    },
    problems: [HttpStatus.NOT_FOUND],
  })
  async me(@Actor() actor: AuthenticatedUser): Promise<CurrentUser> {
    const user = await this.users.findById(actor.id);
    if (user === null) {
      throw new NotFoundException('This user no longer exists');
    }
    return user;
  }
}
