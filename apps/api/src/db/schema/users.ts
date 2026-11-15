import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
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
