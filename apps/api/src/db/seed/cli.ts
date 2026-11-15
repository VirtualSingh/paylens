import { drizzle } from 'drizzle-orm/node-postgres';
import { performance } from 'node:perf_hooks';
import { parseArgs } from 'node:util';
import pg from 'pg';
import { generateAcme } from './generate.js';
import { insertOrg } from './insert.js';

// `pnpm db:seed [--size 500]` — builds the API, then runs this file (docs/vault/design/seed.md).
//   DATABASE_URL_DIRECT  where to write (the owner role's direct URL; .env locally)
//   SEED_CONFIRM=yes     required for any database that is not on this machine
//   SEED_FORCE=yes       replace existing employees (demo users and business data only)
// It prints counts and timing only — never names, emails or salaries (CLAUDE.md).

const { values } = parseArgs({
  options: { size: { type: 'string', default: '10000' } },
});
const size = Number(values.size);
const url = process.env.DATABASE_URL_DIRECT ?? process.env.DATABASE_URL;

if (!Number.isInteger(size) || size < 1) {
  throw new Error(
    `--size must be a positive whole number, got "${values.size}"`,
  );
}
if (!url) {
  throw new Error(
    'Set DATABASE_URL_DIRECT (or DATABASE_URL) to the database to seed',
  );
}
const host = new URL(url).hostname;
if (
  !['localhost', '127.0.0.1'].includes(host) &&
  process.env.SEED_CONFIRM !== 'yes'
) {
  throw new Error(`Seeding ${host} needs SEED_CONFIRM=yes`);
}

const pool = new pg.Pool({ connectionString: url });
try {
  const started = performance.now();
  const org = generateAcme({
    size,
    seed: 42,
    asOf: process.env.SEED_AS_OF ?? '2026-11-01',
  });
  await insertOrg(drizzle(pool), org, {
    force: process.env.SEED_FORCE === 'yes',
  });
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  console.log(
    `Seeded ${org.employees.length} employees, ${org.salaryRecords.length} salary records and ` +
      `${org.payBands.length} pay bands into ${host} in ${seconds} s`,
  );
} finally {
  await pool.end();
}
