/** SQLSTATE 23505 (Postgres docs, appendix A): a row would duplicate a unique key. */
const UNIQUE_VIOLATION = '23505';

/**
 * Whether `error` is the database refusing a duplicate on `constraint`. Drizzle wraps the
 * driver's error (node-postgres or PGlite, same fields) in `cause`, so the chain is walked.
 * Relying on the constraint, rather than checking first, also holds when two requests race.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  for (
    let current: unknown = error;
    typeof current === 'object' && current !== null;
    current = 'cause' in current ? current.cause : undefined
  ) {
    if (
      'code' in current &&
      current.code === UNIQUE_VIOLATION &&
      'constraint' in current &&
      current.constraint === constraint
    ) {
      return true;
    }
  }
  return false;
}
