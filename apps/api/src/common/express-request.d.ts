// Adds the per-request id (set by requestIdMiddleware) to Express's Request type.
// Optional because code that runs outside an HTTP request must not assume it exists.
export {};

declare global {
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}
