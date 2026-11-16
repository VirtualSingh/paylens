import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { userRole } from './enums.js';
import { citext } from './types.js';

/** People who sign in to PayLens (not the employees it manages). */
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: citext('email').notNull().unique(),
  displayName: text('display_name').notNull(),
  /** Google's stable account id, set on first Google sign-in. */
  googleSub: text('google_sub').unique(),
  role: userRole('role').notNull(),
  isDemo: boolean('is_demo').notNull().default(false),
  isActive: boolean('is_active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
});

/**
 * Signed-in sessions when sign-in is on (ADR-014). The cookie carries a random token; only its
 * SHA-256 is stored, so a leaked table cannot be replayed as cookies.
 */
export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id),
    /** Hex SHA-256 of the cookie token. */
    tokenHash: text('token_hash').notNull().unique(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
  },
  // Clean-up of expired sessions scans by expiry.
  (table) => [index('sessions_expires_at').on(table.expiresAt)],
);
