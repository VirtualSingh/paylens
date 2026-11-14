import { PGlite } from '@electric-sql/pglite';
import { btree_gist } from '@electric-sql/pglite/contrib/btree_gist';
import { citext } from '@electric-sql/pglite/contrib/citext';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';

/**
 * A fresh in-memory Postgres for one test file (ADR-007): real SQL, real constraints, no
 * Docker, no network. Extensions match production (data-model.md): btree_gist for the
 * effective-dating exclusion constraints, citext for emails, pg_trgm for name search.
 */
export async function createTestDatabase(): Promise<PGlite> {
  const db = await PGlite.create({
    extensions: { btree_gist, citext, pg_trgm },
  });
  await db.exec(`
    create extension if not exists btree_gist;
    create extension if not exists citext;
    create extension if not exists pg_trgm;
  `);
  return db;
}
