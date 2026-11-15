---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-15
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-15, evening)

- **Phase 0 and Phase 1 done** (one target missed: api suite 41.8 s vs < 40 s). UI unchanged
  since Phase 0 by plan — it is Phase 2.
- API `/api/v1` (behind `x-dev-role` until 2.1; inert in production): directory, profile +
  ETag, salary history, salary change, create / edit / status of a person, countries,
  departments, job families/levels, pay bands with counts, fx-rates. All changes: one
  transaction, If-Match (428/409), domain rules (422 + code), one audit event.
- OpenAPI 3.1 generated from the shared Zod schemas; `docs/api/openapi.json` is committed and
  a test fails when it drifts (`pnpm openapi` regenerates it).
- Neon production: 3 migrations, 10,000 employees / 43,918 salary records / 110 bands (seeded
  in 21.9 s). Live: ready 200; data routes 401 without a session.
- Tests 300 green: domain 71 (100% coverage) · shared 65 · api 154 · web 10.
- CI green again from `ffd2214` (it was red on format for four pushes — see the log).

## Now (next 3 steps)

1. Phase 2.1 — sessions (hashed opaque token, `__Host-pl_session`), `POST /auth/demo`,
   `/auth/logout`, `GET /auth/me`, origin check; a session resolver replaces `x-dev-role`.
2. Phase 2.2 — authorization matrix test (every mutating route × 4 roles), deny-by-default
   startup check, `GET /employees/:id/audit` and `GET /audit`.
3. Phase 2.3–2.4 — web foundation (API client with problem+json, session hook, shell) and
   the directory page per ui-screens.md §4.

## Next (this phase)

- 2.5 profile + change-salary sheet · 2.6 add / edit / status sheets · Google sign-in (2.1)
  once Pushpendra has made the OAuth client (2.7).
- Api suite under 40 s: most time is per-file PGlite + Nest boot; consider fewer, larger
  e2e files or one shared app per worker.

## Later (next phases)

- Phase 3 analytics + import; Phase 4 AI + hardening: directory sort by reporting salary
  ~640 ms at 10k (target p95 300 ms); CI bundle-size check.

## Decisions pending (humans only)

| # | Decision | Default if no answer | Owner | Due |
|---|---|---|---|---|
| D-3 | Assistant model for the demo: Claude Haiku (~$5) vs Gemini Flash-Lite (free) | Provider-neutral code; demo on Gemini Flash-Lite if no key is funded by Phase 4 | Pushpendra | 2026-11-17 |
| D-6 | Google OAuth client for sign-in (task 2.7): create it, then share the client id | Demo login only until it exists | Pushpendra | 2026-11-16 |

D-1, D-2, D-4, D-5 are closed (React; gender female/male; public repo; `main` with CI) —
see [progress/decisions-archive.md](progress/decisions-archive.md).

## Decisions taken (short; ADR has the reasoning)

- Older entries → [progress/decisions-archive.md](progress/decisions-archive.md).
- 2026-11-15 · Terminated is final; a termination closes the open salary on its date; a rehire
  is a new employee (ADR-013).
- 2026-11-15 · Employee codes: one past the highest, allocated under a transaction-scoped
  advisory lock; the unique constraint backs it up. A duplicate email is a 409 caught from the
  constraint (race-safe), not a pre-check.
- 2026-11-15 · An edit writes and audits only fields whose value changes; an edit that changes
  nothing keeps the version. FTE is a canonical decimal string ("0.8", "1").
- 2026-11-15 · Writes to a person live in `EmployeeChangesModule` (it needs employees and
  salaries; keeping it apart avoids a module cycle). Lookups go controller → repository
  (no rules, no pass-through service).
- 2026-11-15 · `@ApiContract` documents each route from the Zod schemas it validates with;
  problem+json and its `ProblemDetails` contract live in libs/shared for the web app.
- 2026-11-15 · The agent checks CI after every push (CI was red four pushes unnoticed).

## Blockers

- (none) — Google sign-in waits on D-6 but demo login does not.

## Review notes from Pushpendra (agent addresses these first)

- 2026-11-15 · Asked for a status report (UI unchanged, CI red, slow pace). Answered; he chose
  to finish Phase 1 before starting the UI. Keep CI green and say what is user-visible.

## Useful facts (no secrets)

- Live: web https://paylens-web-black.vercel.app (proxies /api; use this) · api
  https://paylens-api-swart.vercel.app · docs https://paylens-web-black.vercel.app/api/docs
- Neon: org `rethinklabs` (free) · project `paylens` = `empty-frog-83747850` · aws-ap-southeast-1
  · PG 17 · branch `main` · db `paylens` · roles `paylens_migrator` (owner; migrations; direct
  URL) and `paylens_app` (DML only; 5 s timeout; pooled URL; `src/db/roles/create-app-role.sql`).
  URL without printing it: `export DATABASE_URL_DIRECT="$(neon connection-string --project-id
  empty-frog-83747850 --role-name paylens_migrator --database-name paylens --ssl verify-full)"`.
- Vercel: hobby team `virtualsinghs-projects` (`team_wG8poSJbTMZln6YfqjVsv5hR`) · `paylens-api`
  `prj_2k6HqGjBFxAwi9HQv7Gb2GM7I6Za` (root apps/api, "Other" preset, `api/index.js`, sin1) ·
  `paylens-web` `prj_9JxGKsKfFMAxHklGmrNZA0jiah5x` (root apps/web, Vite). Git deploys from
  `main`. Env: api `DATABASE_URL` (secret, production), `DOCS_PUBLIC=true`.
- Seed timing: local 27.7 s, Neon 21.9 s (10,000 people). Cold `/health/ready`: ~3 s.
- Machine: Windows 11 · Node 24.21 · pnpm 12.18 · gh 2.102 · vercel 65.16 · neon 9.5 · Docker
  Desktop 29.9.3 (container DNS: `--dns 1.1.1.1` to reach Neon) · no Python. MCP (`.mcp.json`):
  vercel, neon (http), nx-mcp.
- Versions: Nx 24.0.6 · NestJS 12.5 · React 19.3 · Vite 8.3 · Vitest 5.0 · TS 6.0.3 · ESLint 9.39
  · Playwright 1.65 · Zod 4.6 · Drizzle 0.45.4 / kit 0.31 · pg 8.23 · PGlite 0.5.16 · helmet 8.3
  · swagger 12.1 · Tailwind 4.3.5 · shadcn 4.23. CI actions pinned by SHA (ci.yml comments).

## Log files

- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session; build 0.0–0.2
- [progress/log-2026-11-15.md](progress/log-2026-11-15.md) — build 0.3–0.6, Phase 1 (1.1–1.6)
- [progress/decisions-archive.md](progress/decisions-archive.md) — older "Decisions taken"
