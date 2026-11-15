import { Injectable } from '@nestjs/common';
import type { Database } from '../db/database.js';
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

/**
 * Append-only (the table refuses UPDATE/DELETE by trigger). Always called with the
 * transaction of the change it describes, so a change and its audit event commit together —
 * never fire-and-forget (architecture.md → request lifecycle).
 */
@Injectable()
export class AuditRepository {
  async append(tx: Database, event: AuditEvent): Promise<void> {
    await tx.insert(auditEvents).values(event);
  }
}
