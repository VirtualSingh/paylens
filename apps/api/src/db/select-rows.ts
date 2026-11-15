import type { SQL } from 'drizzle-orm';
import type { Database } from './database.js';

export type Row = Readonly<Record<string, unknown>>;

/**
 * Runs a hand-written query and returns its rows. node-postgres and PGlite both answer
 * `execute` with `{ rows }`; this checks that instead of trusting a cast.
 */
export async function selectRows(db: Database, query: SQL): Promise<Row[]> {
  const result: unknown = await db.execute(query);
  if (
    typeof result === 'object' &&
    result !== null &&
    'rows' in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }
  throw new TypeError('The database driver returned no rows array');
}

/** Typed readers for one column. Queries select bigints and dates as text (driver-neutral). */
export const column = {
  text(row: Row, name: string): string {
    const value = row[name];
    if (typeof value !== 'string') {
      throw new TypeError(`Column ${name} is not text`);
    }
    return value;
  },
  textOrNull(row: Row, name: string): string | null {
    return row[name] === null ? null : column.text(row, name);
  },
  bigint(row: Row, name: string): bigint {
    return BigInt(column.text(row, name));
  },
  /** An enum column, checked against the values the code knows. */
  oneOf<T extends string>(row: Row, name: string, allowed: readonly T[]): T {
    const value = column.text(row, name);
    const match = allowed.find((candidate) => candidate === value);
    if (match === undefined) {
      throw new TypeError(`Column ${name} has unexpected value "${value}"`);
    }
    return match;
  },
  number(row: Row, name: string): number {
    return Number(row[name]);
  },
};
