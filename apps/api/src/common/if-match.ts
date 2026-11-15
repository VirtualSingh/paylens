import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * The version a client says it last saw, from `If-Match: "3"` (or a weak `W/"3"`). A change
 * without it is refused with 428 Precondition Required (api.md → Concurrency).
 */
export function expectedVersion(ifMatch: string | undefined): number {
  const match = /^(?:W\/)?"(\d+)"$/.exec(ifMatch?.trim() ?? '');
  if (match?.[1] === undefined) {
    throw new HttpException(
      'Send If-Match with the version you loaded (the ETag of the profile)',
      HttpStatus.PRECONDITION_REQUIRED,
    );
  }
  return Number(match[1]);
}
