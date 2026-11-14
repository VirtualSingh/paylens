import { z } from 'zod';

/**
 * `?page=&pageSize=` on every list endpoint (docs/vault/design/api.md → Pagination).
 * Query-string values arrive as text, so they are coerced to numbers.
 */
export const PaginationQuerySchema = z.object({
  page: z.coerce.number(),
  pageSize: z.coerce.number(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;
