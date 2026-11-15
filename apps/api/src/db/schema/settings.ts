import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Organisation-wide settings, e.g. reporting_currency = "USD". */
export const settings = pgTable('settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
});
