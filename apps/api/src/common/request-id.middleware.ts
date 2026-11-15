import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

// Adds the per-request id to Express's Request type. It lives here, next to the code that
// sets it, so every program that loads this middleware also sees the type. Optional because
// code that runs outside an HTTP request must not assume it exists.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace -- Express's types are a global namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

export const REQUEST_ID_HEADER = 'x-request-id';

// A caller's id is kept only if it is a short opaque token, so it can never inject content
// into our logs or response headers.
const SAFE_REQUEST_ID = /^[A-Za-z0-9._-]{1,128}$/;

/**
 * Gives every request an id: the caller's `x-request-id` if it is safe, otherwise a new
 * UUID. The id is echoed in the response and stored on the request for logs and errors.
 */
export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const incoming = req.header(REQUEST_ID_HEADER);
  const requestId =
    incoming !== undefined && SAFE_REQUEST_ID.test(incoming)
      ? incoming
      : randomUUID();

  req.requestId = requestId;
  res.setHeader(REQUEST_ID_HEADER, requestId);
  next();
}
