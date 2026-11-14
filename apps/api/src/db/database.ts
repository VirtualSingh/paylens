import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import { drizzle } from 'drizzle-orm/node-postgres';
import pg from 'pg';

/**
 * Any Drizzle Postgres database: node-postgres against Neon in production, PGlite in
 * tests. Services and repositories depend on this type, never on a driver.
 */
export type Database = PgDatabase<PgQueryResultHKT>;

/** Nest injection token for the Database (like an Angular InjectionToken). */
export const DATABASE = Symbol('DATABASE');

/** Statements are cut off after 5 s so a slow query cannot pin a function (security.md). */
const STATEMENT_TIMEOUT_MS = 5_000;

/**
 * Production database: a node-postgres pool over the pooled (PgBouncer) connection string.
 * The pool connects lazily, on the first query.
 */
export function createDatabase(connectionString: string | undefined): Database {
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }
  const pool = new pg.Pool({
    connectionString,
    statement_timeout: STATEMENT_TIMEOUT_MS,
  });
  return drizzle(pool);
}
