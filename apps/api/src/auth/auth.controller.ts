import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  NotFoundException,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import {
  type AuthConfig,
  AuthConfigSchema,
  type CurrentUser,
  CurrentUserSchema,
  type GoogleSignInRequest,
  GoogleSignInRequestSchema,
} from '@paylens/shared';
import { ApiContract } from '../common/api-contract.js';
import { ZodValidationPipe } from '../common/zod-validation.pipe.js';
import { GoogleSignInService } from './google-sign-in.service.js';
import { readCookie, SESSION_COOKIE } from './session.resolver.js';
import { CurrentUser as Actor, Public, Roles } from './access.decorators.js';
import { AUTH_SETTINGS, type AuthSettings } from './auth-settings.js';
import type { AuthenticatedUser } from './authenticated-user.js';
import { UsersRepository } from './users.repository.js';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax',
  path: '/',
} as const;

@ApiTags('Sign-in')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
    private readonly users: UsersRepository,
    private readonly googleSignIn: GoogleSignInService,
  ) {}

  /**
   * Sign in with the ID token Google gave the browser; sets the session cookie. httpOnly (no
   * script can read it), Secure, SameSite=Lax (other sites' forms cannot send it).
   */
  @Post('google')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiContract({
    summary: 'Sign in with Google (only when sign-in is on)',
    public: true,
    body: GoogleSignInRequestSchema,
    success: {
      status: HttpStatus.OK,
      schema: CurrentUserSchema,
      description: 'Signed in; the session cookie is set',
    },
    problems: [
      HttpStatus.BAD_REQUEST,
      HttpStatus.UNAUTHORIZED,
      HttpStatus.FORBIDDEN,
      HttpStatus.NOT_FOUND,
    ],
  })
  async google(
    @Body(new ZodValidationPipe(GoogleSignInRequestSchema))
    body: GoogleSignInRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<CurrentUser> {
    const { user, token, ttlHours } = await this.googleSignIn.signIn(
      body.idToken,
    );
    response.cookie(SESSION_COOKIE, token, {
      ...COOKIE_OPTIONS,
      maxAge: ttlHours * 60 * 60 * 1000,
    });
    return user;
  }

  /** Sign out: the session ends on the server and the cookie is cleared. */
  @Post('logout')
  @Public()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiContract({
    summary: 'Sign out',
    public: true,
    success: { status: HttpStatus.NO_CONTENT, description: 'Signed out' },
  })
  async logout(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    const token = readCookie(request.header('cookie'), SESSION_COOKIE);
    if (token !== undefined && token !== '') {
      await this.googleSignIn.signOut(token);
    }
    response.cookie(SESSION_COOKIE, '', { ...COOKIE_OPTIONS, maxAge: 0 });
  }

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
