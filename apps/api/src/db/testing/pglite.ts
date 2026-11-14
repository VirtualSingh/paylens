import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { drizzle } from 'drizzle-orm/pglite';
import { migrate } from 'drizzle-orm/pglite/migrator';
import { fileURLToPath } from 'node:url';

const MIGRATIONS_FOLDER = fileURLToPath(
  new URL('../migrations', import.meta.url),
);

/**
 * A fresh in-memory Postgres for one test file (ADR-007): real SQL, real constraints, no
 * Docker, no network. The extension binaries production uses are loaded into PGlite, then
 * the project's own migrations run — the same ones `pnpm db:migrate` applies to Neon.
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = await PGlite.create({
    extensions: { btree_gist, citext, pg_trgm },
  });
  await migrate(drizzle(db), { migrationsFolder: MIGRATIONS_FOLDER });
  return db;
}
