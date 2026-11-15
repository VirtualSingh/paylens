import { Inject, Injectable } from '@nestjs/common';
import type { AuditEventJson } from '@paylens/shared';
import { type SQL, sql } from 'drizzle-orm';
import { type Database, DATABASE } from '../db/database.js';
import { column, selectRows } from '../db/select-rows.js';
import { auditEvents } from '../db/schema/index.js';

export interface AuditEvent {
  /** null for actions with no user row behind them (system, Phase-1 dev header). */
  readonly actorUserId: string | null;
  /** e.g. "salary.changed" */
  readonly action: string;
  readonly entityType: string;
  readonly entityId: string;
  /** JSON-safe snapshots (money as strings); never sent to logs. */
  readonly before: unknown;
  readonly after: unknown;
  readonly requestId: string | null;
}

/** What the log can be narrowed by; dates are whole UTC days, both ends included. */
export interface AuditFilter {
  readonly entityType?: string;
  readonly entityId?: string;
  readonly actor?: string;
  readonly action?: string;
  readonly from?: string;
  readonly to?: string;
}

/**
 * Append-only (the table refuses UPDATE/DELETE by trigger). Always called with the
 * transaction of the change it describes, so a change and its audit event commit together —
 * never fire-and-forget (architecture.md → request lifecycle).
 */
@Injectable()
export class AuditRepository {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async append(tx: Database, event: AuditEvent): Promise<void> {
    await tx.insert(auditEvents).values(event);
  }

  /** One page of matching events, newest first, and how many match in all. */
  async list(
    filter: AuditFilter,
    page: { readonly page: number; readonly pageSize: number },
  ): Promise<{ rows: AuditEventJson[]; total: number }> {
    const where = whereClause(filter);
    const [countRows, pageRows] = await Promise.all([
      selectRows(
        this.db,
        sql`select count(*)::int as total from audit_events a ${where}`,
      ),
      selectRows(
        this.db,
        sql`select a.id::text, a.action, a.entity_type, a.entity_id::text,
                   a.actor_user_id::text, u.display_name, a.before, a.after,
                   a.request_id, to_json(a.created_at) #>> '{}' as created_at
            from audit_events a
            left join users u on u.id = a.actor_user_id
            ${where}
            order by a.created_at desc, a.id desc
            limit ${page.pageSize} offset ${(page.page - 1) * page.pageSize}`,
      ),
    ]);

    return {
      total: column.number(countRows[0] ?? { total: 0 }, 'total'),
      rows: pageRows.map((row) => {
        const actorId = column.textOrNull(row, 'actor_user_id');
        return {
          id: column.text(row, 'id'),
          action: column.text(row, 'action'),
          entityType: column.text(row, 'entity_type'),
          entityId: column.text(row, 'entity_id'),
          actor:
            actorId === null
              ? null
              : { id: actorId, displayName: column.text(row, 'display_name') },
          // jsonb arrives parsed from both drivers.
          before: row['before'] ?? null,
          after: row['after'] ?? null,
          requestId: column.textOrNull(row, 'request_id'),
          createdAt: column.text(row, 'created_at'),
        };
      }),
    };
  }
}

function whereClause(filter: AuditFilter): SQL {
  const conditions: SQL[] = [];
  if (filter.entityType !== undefined) {
    conditions.push(sql`a.entity_type = ${filter.entityType}`);
  }
  if (filter.entityId !== undefined) {
    conditions.push(sql`a.entity_id = ${filter.entityId}::uuid`);
  }
  if (filter.actor !== undefined) {
    conditions.push(sql`a.actor_user_id = ${filter.actor}::uuid`);
  }
  if (filter.action !== undefined) {
    conditions.push(sql`a.action = ${filter.action}`);
  }
  if (filter.from !== undefined) {
    conditions.push(
      sql`a.created_at >= (${filter.from}::date)::timestamp at time zone 'UTC'`,
    );
  }
  if (filter.to !== undefined) {
    // Through the end of that day: before midnight UTC of the next one.
    conditions.push(
      sql`a.created_at < (${filter.to}::date + 1)::timestamp at time zone 'UTC'`,
    );
  }
  return conditions.length === 0
    ? sql``
    : sql`where ${sql.join(conditions, sql` and `)}`;
}
