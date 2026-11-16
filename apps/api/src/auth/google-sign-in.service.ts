import {
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CurrentUser, UserRole } from '@paylens/shared';
import {
  AUTH_SETTINGS,
  type AuthSettings,
  sessionTtlHours,
} from './auth-settings.js';
import {
  type GoogleIdentity,
  GoogleTokenVerifier,
} from './google-token-verifier.js';
import { SessionsRepository } from './sessions.repository.js';
import { UsersRepository } from './users.repository.js';

/**
 * "Sign in with Google" (ADR-006, ADR-014): Google vouches for the person, our allow-lists
 * decide whether they may come in and with which role, and a session starts.
 */
@Injectable()
export class GoogleSignInService {
  constructor(
    @Inject(AUTH_SETTINGS) private readonly settings: AuthSettings,
    private readonly google: GoogleTokenVerifier,
    private readonly users: UsersRepository,
    private readonly sessions: SessionsRepository,
  ) {}

  async signIn(
    idToken: string,
  ): Promise<{ user: CurrentUser; token: string; ttlHours: number }> {
    if (!this.settings.authEnabled) {
      // With sign-in off there is nothing to sign in to (ADR-014).
      throw new NotFoundException('Sign-in is off for this deployment');
    }
    const identity = await this.google.verify(idToken).catch(() => {
      throw new UnauthorizedException('Google did not confirm this sign-in');
    });
    if (!identity.emailVerified) {
      throw new UnauthorizedException(
        'Google has not verified this email address',
      );
    }

    const user = await this.userFor(identity);
    const ttlHours = sessionTtlHours(this.settings);
    const token = await this.sessions.create(user.id, ttlHours);
    return { user, token, ttlHours };
  }

  signOut(token: string): Promise<void> {
    return this.sessions.revoke(token);
  }

  /** The existing user, or a new one when the allow-lists let this account in. */
  private async userFor(identity: GoogleIdentity): Promise<CurrentUser> {
    const existing = await this.users.findForGoogle(identity);
    if (existing !== null) {
      if (!existing.isActive) {
        throw new ForbiddenException('This account has been switched off');
      }
      await this.users.recordSignIn(existing.id, identity);
      return {
        id: existing.id,
        email: existing.email,
        displayName: existing.displayName,
        role: existing.role,
        isDemo: existing.isDemo,
      };
    }
    const role = this.roleFor(identity.email.toLowerCase());
    if (role === null) {
      throw new ForbiddenException('This Google account may not use PayLens');
    }
    return this.users.createFromGoogle(identity, role);
  }

  /** ADMIN_EMAILS become admins; ALLOWED_EMAIL_DOMAINS come in as viewers; others stay out. */
  private roleFor(email: string): UserRole | null {
    if ((this.settings.adminEmails ?? []).includes(email)) {
      return 'admin';
    }
    const domain = email.split('@')[1] ?? '';
    return (this.settings.allowedEmailDomains ?? []).includes(domain)
      ? 'viewer'
      : null;
  }
}
