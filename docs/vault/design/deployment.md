---
title: Deployment — environments, env vars, CI/CD, Vercel + Neon, Docker
updated: 2026-11-14
status: active
---

# Deployment

Target: free, reliable for weeks without a human touching it, and operable by an agent via
official MCP servers / CLIs (Vercel MCP, Neon MCP, GitHub MCP).

## Environments

| Env | Web | API | DB | Notes |
|---|---|---|---|---|
| local | Vite dev server (`/api` proxied) | `nest start --watch` | Docker Postgres 17 (`docker compose up db`) | `pnpm dev` runs both |
| test | — | Nest testing module | PGlite in-process | no Docker needed |
| preview | Vercel preview per PR | Vercel preview per PR | Neon **branch** per PR (optional; else shared `preview` branch) | smoke test in CI |
| production | Vercel project `paylens-web` | Vercel project `paylens-api` (NestJS zero-config → one Function) | Neon `main` branch, pooled connection string | demo login on |

## Vercel setup (two projects, one repo)

- `paylens-api`: root directory `apps/api`; Vercel detects NestJS. Build runs
  `pnpm nx build api`; entry `src/main.ts` keeps `bootstrap()` + `app.listen()`.
  Run migrations in the build step **only** when `RUN_MIGRATIONS_ON_BUILD=true`
  (`pnpm db:migrate && pnpm nx build api`); trade-off recorded in ADR-008.
- `paylens-web`: root directory `apps/web`; Vite preset; `vercel.json` rewrites
  `/api/:path*` → `https://<api-deployment>/api/:path*` and sets caching headers for assets.
  Preview deployments point at the matching API preview via `VITE_API_ORIGIN` env or the
  rewrite destination variable.
- Function limits to respect: 250 MB bundle (keep heavy deps in `devDependencies`), no
  in-process schedulers (use Vercel Cron for the nightly demo reset if wanted).
- Fluid compute reduces cold starts; the first request after idle may still take ~1 s.

## Neon setup

- Project `paylens`, region nearest Vercel function region (set both to the same region,
  e.g. `iad1` / `aws-us-east-1`). Free plan: compute scales to zero after 5 min, resumes in
  well under a second to a few seconds — acceptable; mention in README.
- Use the **pooled** connection string for the API (PgBouncer) and the **direct** string
  for migrations/seed. Two DB roles: `paylens_app` (DML, no DDL, append-only on audit) and
  `paylens_migrator` (owner).
- Extensions enabled by the first migration: `btree_gist`, `pg_trgm`, `citext`.
- Seed production once: `DATABASE_URL=<direct> SEED_CONFIRM=yes pnpm db:seed` (refuses if
  employees exist unless `SEED_FORCE=yes`). Record the seed version in `settings`.

## Environment variables (`.env.example` is the source of truth)

```
NODE_ENV, PORT=3000, LOG_LEVEL=info
DATABASE_URL (pooled)   DATABASE_URL_DIRECT (migrations/seed)
SESSION_SECRET (32+ bytes)   SESSION_TTL_HOURS=12   SESSION_MAX_DAYS=7
APP_ORIGIN=https://paylens-web.vercel.app          (CSRF origin check, cookie settings)
GOOGLE_CLIENT_ID                                  (public; also VITE_GOOGLE_CLIENT_ID for web)
ALLOWED_EMAIL_DOMAINS / ADMIN_EMAILS               (who gets which role on first login)
DEMO_MODE=true   DEMO_RESET_TOKEN
AI_MODEL, ANTHROPIC_API_KEY | GOOGLE_GENERATIVE_AI_API_KEY | OPENAI_API_KEY
AI_DAILY_CAP=50  AI_DAILY_TOKEN_BUDGET=2000000  AI_ENABLED=true
DOCS_PUBLIC=true  RUN_MIGRATIONS_ON_BUILD=true
```
Secrets never appear in the repo; Vercel env UI (or Vercel MCP) holds them per environment.

## CI/CD (GitHub Actions, `.github/workflows/ci.yml`)

Jobs on every push and PR (pinned action SHAs, `pnpm install --frozen-lockfile`, Nx cache):
1. `lint-typecheck` — ESLint, `tsc --noEmit`, Prettier check.
2. `test` — `pnpm nx run-many -t test --coverage` (PGlite inside; no services needed); upload coverage.
3. `build` — `pnpm nx run-many -t build`; bundle-size check for web (≤ 250 KB gz initial).
4. `security` — `pnpm audit --prod --audit-level=high`, `gitleaks`, `osv-scanner`.
5. `e2e` (PR only, optional) — Playwright against a built preview or local stack with a 500-row seed.
Deploy: Vercel Git integration (push to `main` → production; PR → preview). Branch
protection: CI required before merge; agent works on short-lived branches merged via PR
*or* directly on `main` with CI — decide once in Phase 0 (default: `main` with CI, since
the commit history is the artefact and PR squash would hide the TDD cadence).

## Docker (F-37)

- `Dockerfile` (multi-stage, `node:22-alpine`, non-root user, `HEALTHCHECK` on `/api/v1/health`)
  builds the API image; `docker run -p 3000:3000 --env-file .env paylens-api`.
- `docker-compose.yml`: `db` (postgres:17 with extensions init script), optional `api`.
- Cloud Run: `gcloud run deploy paylens-api --source apps/api` works without changes; documented
  as the scalable alternative (needs a billing account, so not the default).

## Operations runbook (short)

- Health: `GET /api/v1/health/ready` checks DB; Vercel alerts on function errors.
- Logs: Vercel runtime logs (structured JSON); request id ties web → api → audit.
- Reset demo data: `pnpm db:reset-demo` (truncates business tables, re-seeds, keeps users).
- Rotate secrets: change in Vercel env, redeploy; sessions are invalidated by rotating `SESSION_SECRET` only if you choose signed cookies (we hash tokens, so rotation does not log users out — documented).
- Rollback: Vercel "promote previous deployment"; DB migrations are forward-only with a
  documented manual `down` for each in `apps/api/src/db/migrations/README.md`.

## Pre-submission deployment checklist

- [ ] Production URL loads in < 2 s cold; demo login works; viewer login works
- [ ] Google sign-in works with a non-test account (consent screen published, basic scopes)
- [ ] `/api/docs` reachable (if `DOCS_PUBLIC`), health endpoints green
- [ ] Seed is the full 10,000 employees; dashboard numbers match local
- [ ] README has the live URL, the video link, setup steps, and the "known limitations" list
