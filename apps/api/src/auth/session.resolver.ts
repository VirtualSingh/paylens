import { createHash } from 'node:crypto';
import { USER_ROLES } from '@paylens/shared';
import { sql } from 'drizzle-orm';
import type { Request } from 'express';
import type { Database } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';
import { type AuthenticatedUser, UserResolver } from './authenticated-user.js';

/** `__Host-` makes browsers insist on Secure, Path=/ and no Domain (cookie prefixes). */
export const SESSION_COOKIE = '__Host-pl_session';

/** The stored form of a session token: never the token itself (ADR-014). */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/** One cookie's value from a Cookie header, without a parsing library. */
export function readCookie(
  header: string | undefined,
  name: string,
): string | undefined {
  for (const part of (header ?? '').split(';')) {
    const [key, ...value] = part.trim().split('=');
    if (key === name) {
      return decodeURIComponent(value.join('='));
    }
  }
  return undefined;
}

/**
 * Sign-in on (ADR-014): the user is whoever the session cookie belongs to, while the session
 * is neither expired nor revoked and the user is still active. No cookie → nobody (401).
 */
export class SessionResolver extends UserResolver {
  constructor(private readonly db: Database) {
    super();
  }

  async resolve(
    request: Pick<Request, 'header'>,
  ): Promise<AuthenticatedUser | null> {
    const token = readCookie(request.header('cookie'), SESSION_COOKIE);
    if (token === undefined || token === '') {
      return null;
    }
    const rows = await selectRows(
      this.db,
      sql`select u.id::text, u.role::text, u.is_demo
          from sessions s join users u on u.id = s.user_id
          where s.token_hash = ${hashToken(token)}
            and s.revoked_at is null
            and s.expires_at > now()
            and u.is_active`,
    );
    const row = rows[0];
    return row === undefined
      ? null
      : {
          id: column.text(row, 'id'),
          role: column.oneOf(row, 'role', USER_ROLES),
          isDemo: row['is_demo'] === true,
        };
  }
}
