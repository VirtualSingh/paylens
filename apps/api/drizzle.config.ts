import { defineConfig } from 'drizzle-kit';
import { existsSync } from 'node:fs';

// Local runs read the repo-root .env (git-ignored); CI and Vercel pass real env vars.
// Paths are relative to apps/api: the db:* scripts run drizzle-kit from this folder.
const LOCAL_ENV_FILE = '../../.env';
if (existsSync(LOCAL_ENV_FILE)) {
  process.loadEnvFile(LOCAL_ENV_FILE);
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/db/schema/index.ts',
  out: './src/db/migrations',
  // Migrations use the direct (non-pooled) connection: DDL through PgBouncer is unreliable.
  dbCredentials: { url: process.env.DATABASE_URL_DIRECT ?? '' },
  strict: true,
  verbose: true,
});
