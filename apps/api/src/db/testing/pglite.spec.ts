import type { PGlite } from '@electric-sql/pglite';
import { createTestDatabase } from './pglite.js';

describe('PGlite test database', () => {
  let db: PGlite;

  beforeAll(async () => {
    db = await createTestDatabase();
  });

  afterAll(async () => {
    await db.close();
  });

  it('answers a query in-process, without Docker', async () => {
    const result = await db.query<{ answer: number }>('select 1 as answer');

    expect(result.rows).toEqual([{ answer: 1 }]);
  });

  it('has the extensions the schema needs', async () => {
    const result = await db.query<{ extname: string }>(
      'select extname from pg_extension',
    );

    expect(result.rows.map((row) => row.extname)).toEqual(
      expect.arrayContaining(['btree_gist', 'citext', 'pg_trgm']),
    );
  });

  it('rejects overlapping periods through a gist exclusion constraint', async () => {
    await db.exec(`
      create table scratch_periods (
        owner_id integer not null,
        effective_from date not null,
        effective_to date,
        exclude using gist (
          owner_id with =,
          daterange(effective_from, effective_to, '[)') with &&
        )
      );
      insert into scratch_periods values (1, '2026-01-01', '2026-07-01');
    `);

    const overlapping = db.query(
      `insert into scratch_periods values (1, '2026-06-01', null)`,
    );

    await expect(overlapping).rejects.toThrow(/exclusion constraint/);
  });
});
