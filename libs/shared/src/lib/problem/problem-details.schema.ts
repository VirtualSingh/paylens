import { z } from 'zod';

/** One invalid field: where it is in the input ("salary.amount.currency") and what is wrong. */
export const FieldErrorSchema = z.object({
  path: z.string(),
  message: z.string(),
});
export type FieldError = z.infer<typeof FieldErrorSchema>;

/**
 * Every error the API returns, as `application/problem+json` (RFC 9457, api.md → Errors).
 * Forms show `errors` inline; broken business rules carry a stable `code`; server errors
 * carry nothing beyond their status and the request id to quote to support.
 */
export const ProblemDetailsSchema = z.object({
  type: z.string(),
  title: z.string(),
  status: z.number().int(),
  detail: z.string().optional(),
  /** For broken business rules (422): the rule's stable code, e.g. "reporting_cycle". */
  code: z.string().optional(),
  /** For invalid input (400): every field that failed. */
  errors: z.array(FieldErrorSchema).optional(),
  instance: z.string(),
  requestId: z.string().optional(),
});
export type ProblemDetails = z.infer<typeof ProblemDetailsSchema>;
