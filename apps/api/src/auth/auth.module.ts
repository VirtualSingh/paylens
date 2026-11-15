import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AccessGuard } from './access.guard.js';
import { UserResolver } from './authenticated-user.js';
import { DevRoleHeaderResolver } from './dev-role.resolver.js';

@Module({
  providers: [
    {
      // Phase 1: the dev header (inert in production). Phase 2: session sign-in.
      provide: UserResolver,
      useFactory: () => new DevRoleHeaderResolver(process.env.NODE_ENV),
    },
    // Every route passes through the guard; there is no opting out by forgetting.
    { provide: APP_GUARD, useClass: AccessGuard },
  ],
})
export class AuthModule {}
