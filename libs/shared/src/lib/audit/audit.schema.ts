import { z } from 'zod';
import { pageOf } from '../employees/employee-list-item.schema.js';
import { PaginationQuerySchema } from '../pagination/pagination-query.schema.js';

/**
 * One entry of the audit log: who changed what, when, and the values before and after.
 * Append-only (ADR-005); HR managers and admins read it (api.md → Audit).
 */
export const AuditEventJsonSchema = z.object({
  /** A bigint identity, as a string like every bigint in the contract. */
  id: z.string(),
  /** "thing.happened": salary.changed, employee.created, employee.updated, … */
  action: z.string(),
  entityType: z.string(),
  entityId: z.uuid(),
  /** null when the system acted (seed, imports) or before sign-in existed. */
  actor: z.object({ id: z.uuid(), displayName: z.string() }).nullable(),
  /** The changed values as they were; null for a creation. */
  before: z.unknown(),
  after: z.unknown(),
  requestId: z.string().nullable(),
  createdAt: z.string(),
});
export type AuditEventJson = z.infer<typeof AuditEventJsonSchema>;

/** Newest first, in the usual list envelope. */
export const AuditPageSchema = pageOf(AuditEventJsonSchema);
export type AuditPage = z.infer<typeof AuditPageSchema>;

/** `GET /audit` filters (api.md); dates are whole UTC days, both ends included. */
export const AuditQuerySchema = PaginationQuerySchema.extend({
  entityType: z
    .string()
    .regex(/^[a-z_]{1,32}$/)
    .optional(),
  entityId: z.uuid().optional(),
  actor: z.uuid().optional(),
  action: z
    .string()
    .regex(/^[a-z_]{1,32}\.[a-z_]{1,32}$/)
    .optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
}).refine(
  ({ from, to }) => from === undefined || to === undefined || from <= to,
  { message: 'The range must end on or after its start', path: ['to'] },
);
export type AuditQuery = z.infer<typeof AuditQuerySchema>;
