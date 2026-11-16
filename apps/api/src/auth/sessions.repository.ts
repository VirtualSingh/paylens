import { randomBytes } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { hashToken } from './session.resolver.js';

@Injectable()
export class SessionsRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  /**
   * Starts a session and returns the token for the cookie. 32 random bytes; only the hash is
   * stored, so the table alone never signs anyone in.
   */
  async create(userId: string, ttlHours: number): Promise<string> {
    const token = randomBytes(32).toString('base64url');
    await this.db.execute(
      sql`insert into sessions (user_id, token_hash, expires_at)
          values (${userId}::uuid, ${hashToken(token)},
                  now() + make_interval(hours => ${ttlHours}))`,
    );
    return token;
  }

  /** Ends a session now; an unknown token is simply nothing to revoke. */
  async revoke(token: string): Promise<void> {
    await this.db.execute(
      sql`update sessions set revoked_at = now()
          where token_hash = ${hashToken(token)} and revoked_at is null`,
    );
  }
}
