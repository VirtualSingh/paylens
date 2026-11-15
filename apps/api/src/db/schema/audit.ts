import {
  bigint,
  index,
  jsonb,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { users } from './users.js';

/**
 * Who changed what, when and why. Append-only for every role: a trigger in the migration
 * refuses UPDATE and DELETE (ADR-005, security.md). No `updated_at` by design.
 */
export const auditEvents = pgTable(
  'audit_events',
  {
    id: bigint('id', { mode: 'bigint' })
      .primaryKey()
      .generatedAlwaysAsIdentity(),
    /** null for system actions (seed, imports by the system). */
    actorUserId: uuid('actor_user_id').references(() => users.id),
    /** e.g. "salary.changed", "employee.created" */
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: uuid('entity_id').notNull(),
    before: jsonb('before'),
    after: jsonb('after'),
    requestId: text('request_id'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    // An entity's timeline (profile → Audit tab).
    index('audit_events_entity').on(
      table.entityType,
      table.entityId,
      table.createdAt.desc(),
    ),
    // Everything one person did (audit log filtered by actor).
    index('audit_events_actor').on(table.actorUserId, table.createdAt.desc()),
  ],
);
