import { ApiError } from './api-client';

/** Where a failed save's explanation goes: onto fields, or one message for the whole form. */
export interface FormProblem {
  readonly fields: readonly { field: string; message: string }[];
  readonly message: string | null;
  /** 409 on an If-Match change: offer a reload instead of a retry. */
  readonly conflict: boolean;
}

/**
 * Turns a failed save into what a form shows (ui.md → Errors: "field errors inline from
 * problem+json errors[]"). 400 field errors and 422 rule codes land on their fields when the
 * form has them; anything else becomes one message, with the request id to quote.
 */
export function formProblem(
  error: unknown,
  options: {
    /** Form field names; an API path's first segment is matched against them. */
    readonly fields: readonly string[];
    /** Domain rule code (422) → the field it is about. */
    readonly ruleFields?: Readonly<Record<string, string>>;
    /** A 409 that is about a field (e.g. a taken email) rather than a stale version. */
    readonly conflictField?: string;
  },
): FormProblem {
  if (!(error instanceof ApiError)) {
    return {
      fields: [],
      message: 'This could not be saved. Try again.',
      conflict: false,
    };
  }
  if (error.status === 409) {
    return options.conflictField === undefined
      ? { fields: [], message: error.message, conflict: true }
      : {
          fields: [{ field: options.conflictField, message: error.message }],
          message: null,
          conflict: false,
        };
  }
  const code = error.problem.code;
  const ruleField = code === undefined ? undefined : options.ruleFields?.[code];
  if (ruleField !== undefined) {
    return {
      fields: [{ field: ruleField, message: error.message }],
      message: null,
      conflict: false,
    };
  }
  const fields = (error.problem.errors ?? []).flatMap(({ path, message }) => {
    const field = options.fields.find((name) => name === path.split('.')[0]);
    return field === undefined ? [] : [{ field, message }];
  });
  if (fields.length > 0) {
    return { fields, message: null, conflict: false };
  }
  const requestId = error.problem.requestId;
  return {
    fields: [],
    message: `${error.message}${requestId === undefined ? '' : ` (request ${requestId})`}`,
    conflict: false,
  };
}
