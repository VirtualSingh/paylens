import { BadRequestException, type PipeTransform } from '@nestjs/common';
import type { z } from 'zod';

/** One invalid field, as listed in a 400 problem's `errors` (api.md → Errors). */
export interface FieldError {
  /** Dotted path into the input, e.g. "pageSize" or "sort.0.field". */
  readonly path: string;
  readonly message: string;
}

/** Raised by ZodValidationPipe; ProblemDetailsFilter renders `errors`. */
export class RequestValidationError extends BadRequestException {
  constructor(readonly errors: readonly FieldError[]) {
    super('Some fields are invalid');
  }
}

/**
 * Validates and converts a request part (query, body, params) with one of the shared Zod
 * schemas from libs/shared — the same schema the web app's forms use — so the handler only
 * ever receives typed, valid input (CLAUDE.md: validate at the boundary).
 */
export class ZodValidationPipe<
  Schema extends z.ZodType,
> implements PipeTransform<unknown, z.output<Schema>> {
  constructor(private readonly schema: Schema) {}

  transform(value: unknown): z.output<Schema> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new RequestValidationError(
        result.error.issues.map((issue) => ({
          path: issue.path.join('.'),
          message: issue.message,
        })),
      );
    }
    return result.data;
  }
}
