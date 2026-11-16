import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { type Database, DATABASE } from '../db/database.js';
import { AccessGuard } from './access.guard.js';
import { ActingRoleResolver } from './acting-role.resolver.js';
import { AuthController } from './auth.controller.js';
import {
  AUTH_SETTINGS,
  type AuthSettings,
  authSettingsFromEnv,
} from './auth-settings.js';
import { UserResolver } from './authenticated-user.js';
import { SessionResolver } from './session.resolver.js';
import { UsersRepository } from './users.repository.js';
import { GoogleSignInService } from './google-sign-in.service.js';
import {
  GoogleAuthLibraryVerifier,
  GoogleTokenVerifier,
} from './google-token-verifier.js';
import { SessionsRepository } from './sessions.repository.js';

@Module({
  controllers: [AuthController],
  providers: [
    {
      provide: AUTH_SETTINGS,
      useFactory: () => authSettingsFromEnv(process.env),
    },
    {
      // One flag picks how a request becomes a user (ADR-014); the guard does not change.
      provide: UserResolver,
      inject: [AUTH_SETTINGS, DATABASE],
      useFactory: (settings: AuthSettings, db: Database) =>
        settings.authEnabled
          ? new SessionResolver(db)
          : new ActingRoleResolver(),
    },
    UsersRepository,
    SessionsRepository,
    GoogleSignInService,
    {
      provide: GoogleTokenVerifier,
      inject: [AUTH_SETTINGS],
      useFactory: (settings: AuthSettings) =>
        new GoogleAuthLibraryVerifier(settings.googleClientId ?? ''),
    },
    // Every route passes through the guard; there is no opting out by forgetting.
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
  exports: [AUTH_SETTINGS, UsersRepository],
})
export class AuthModule {}
