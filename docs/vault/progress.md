---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-15
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-15, midday)

- **Phase 0 complete except one exit target** (`pnpm test` 30 s here vs < 20 s). Walking
  skeleton live: https://paylens-web-black.vercel.app → `/api/*` rewrite → paylens-api
  (Vercel Function, sin1) → Neon Postgres 17 (Singapore). `/api/v1/health/ready` 200, db up.
- CI green on every push since 3f9cda6 (lint/typecheck/format, test+coverage, build,
  security: audit --prod, gitleaks, OSV with ADR-012 exceptions).
- Tests: domain 2 · shared 10 · api 20 (PGlite) · web 10 + 1 Playwright smoke; live site
  checked in Chromium: no CSP violations, Plex loaded, shell as ui.md.
- API deploys as `apps/api/api/index.js` over the tsc build (ADR-011 addendum): Vercel's
  NestJS preset failed four times compiling src/main.ts itself.
- Tools: gh, vercel/neon CLIs, Docker, Vercel/Neon/Nx MCP all connected. The Vercel MCP lacks
  scope on the hobby team (needs an "authorize team access" click); the CLI is used instead.
- Frontend framework: **React — final** (D-1 closed; ADR-003).

## Now (next 3 steps)

1. Phase 1 · 1.1 — domain lib: Money (subtract, multiplyRatio, format), annualize, FX
   conversion (exact rational bigint math, half-even), band metrics, salary-change planning.
2. Phase 1 · 1.2 — Drizzle schema + exclusion constraints (PGlite-tested), views, indexes.
3. Phase 1 · 1.3–1.6 — repositories, 10k seed, employees/salary API, deploy; then Phase 2.

## Next (this phase → Phase 1)

- `pnpm test` under 20 s: the health spec boots two PGlites (~6 s); share one, or a template DB.
- Branch protection: not enabled — D-5 is `main` with CI; required checks would block direct pushes.
- Optional: Vercel MCP "authorize team access" so deploy inspection works through MCP too.

## Later (next phase)

- Phase 1: domain lib → schema + exclusion constraints → repositories → seed → employees API.

## Decisions pending (humans only)

| # | Decision | Default if no answer | Owner | Due |
|---|---|---|---|---|
| ~~D-1~~ | ~~Frontend: React vs Angular~~ — answered: React (no recruiter reply expected) | React | Pushpendra (recruiter) | 2026-11-15 |
| ~~D-2~~ | ~~Gender in data model for pay-gap (F-22)~~ — answered: `female` \| `male`, required; suppression n<5 | Include, optional field, suppression n<5 | Pushpendra | 2026-11-15 |
| D-3 | Assistant model for the demo: Claude Haiku (~$5) vs Gemini Flash-Lite (free) | Provider-neutral code; demo on Gemini Flash-Lite if no key is funded by Phase 4 | Pushpendra | 2026-11-17 |
| ~~D-4~~ | ~~Repo public or private~~ — answered: Pushpendra created the repo public | Public | Pushpendra | 2026-11-15 |
| ~~D-5~~ | ~~Commit directly to `main` with CI vs PR flow~~ — default taken (no objection; "continue"): `main` with CI | `main` with CI (history is the artefact) | Pushpendra | 2026-11-15 |

## Decisions taken (short; ADR has the reasoning)

- 2026-11-14 entries (stack, money, dating, auth, testing, tooling, Node 24, Nx 24, hooks …) →
  [progress/decisions-archive.md](progress/decisions-archive.md).
- 2026-11-15 · DB driver: `pg` (node-postgres) + Drizzle over Neon's pooled URL, 5 s
  statement_timeout; tests inject PGlite behind the same `Database` type (DATABASE token).
- 2026-11-15 · a11y tests call axe-core directly (5-line helper) instead of vitest-axe,
  which has had no release since 2022.
- 2026-11-15 · shadcn/ui initialised (config, `@/` alias, cn, colours mapped onto ui.md
  tokens) but primitives are added with their first feature, not all eight in Phase 0 —
  no unused, untested vendored code in the history.
- 2026-11-15 · 5xx responses never carry the exception message; logs keep stack frames but
  drop the message line (it can quote emails or connection strings).
- 2026-11-15 · Extensions are enabled by migration 0000 (not a docker init script), so Neon,
  docker and the PGlite harness all get them the same way; the harness applies migrations.
- 2026-11-15 · **No `Co-Authored-By` trailers in commit messages** (Pushpendra). Commits up to
  `22d481a` keep theirs: removing them would need a history rewrite + force push (CLAUDE.md forbids).
- 2026-11-15 · CI bundle-size check (deployment.md) deferred to the Phase 4 performance pass.
- 2026-11-15 · D-1 closed: React ecosystem (Pushpendra: the recruiter is not expected to reply).
- 2026-11-15 · Region Singapore for both Neon (aws-ap-southeast-1) and Vercel functions (sin1):
  deployment.md only requires "same region"; Singapore is nearest to India-based reviewers.
- 2026-11-15 · Two DB roles: migrations as owner over the direct URL; the API as `paylens_app`
  (DML only, 5 s timeout) over the pooler. Secrets go shell variable → Vercel, never to disk.
- 2026-11-15 · API on Vercel via a plain-JS function over our tsc build, not the NestJS preset
  (ADR-011 addendum). Web adds CSP/HSTS/etc. in vercel.json; `/api` rewritten (ADR-008).
- 2026-11-15 · Vercel projects created with the CLI's `vercel api` (same endpoint the MCP uses)
  because the MCP connection lacks scope on the hobby team.

## Blockers

- ~~GitHub Actions billing lock~~ — resolved 2026-11-15 by Pushpendra; jobs run normally.
- ~~Docker not installed~~ — resolved 2026-11-15 (Docker Desktop 29.9.3).
- ~~Vercel and Neon MCP OAuth~~ — done by Pushpendra 2026-11-15; tools appear after a restart.

## Review notes from Pushpendra (agent addresses these first)

- (empty)

## Useful facts (no secrets)

- Live: web https://paylens-web-black.vercel.app (proxies /api; use this) · api
  https://paylens-api-swart.vercel.app · docs https://paylens-web-black.vercel.app/api/docs
- Neon: org `rethinklabs` (free) · project `paylens` = `empty-frog-83747850` · aws-ap-southeast-1
  · PG 17 · branch `main` · db `paylens` · roles `paylens_migrator` (owner; migrations; direct
  URL) and `paylens_app` (DML only; 5 s timeout; pooled URL; `src/db/roles/create-app-role.sql`).
- Vercel: hobby team `virtualsinghs-projects` (`team_wG8poSJbTMZln6YfqjVsv5hR`) · `paylens-api`
  `prj_2k6HqGjBFxAwi9HQv7Gb2GM7I6Za` (root apps/api, "Other" preset, `api/index.js`, sin1) ·
  `paylens-web` `prj_9JxGKsKfFMAxHklGmrNZA0jiah5x` (root apps/web, Vite). Git deploys from
  `main`. Env: api `DATABASE_URL` (secret, production), `DOCS_PUBLIC=true`.
- Seed timing: local _tbd_, Neon _tbd_. Cold `/health/ready`: ~3 s (function + Neon resume).
- Machine: Windows 11 · Node 24.21 · pnpm 12.18 (npm -g) · git 2.37 · gh 2.102 · vercel 65.16 ·
  neon 9.5 · Docker Desktop 29.9.3 (container DNS: pass `--dns 1.1.1.1` to reach Neon) ·
  Claude Code 2.1.325. MCP (`.mcp.json`): vercel, neon (http), nx-mcp (`node node_modules/…`).
- Versions: Nx 24.0.6 · NestJS 12.5 · React 19.3 · Vite 8.3 · Vitest 5.0 · TS 6.0.3 · ESLint 9.39
  · Playwright 1.65 · Zod 4.6 · Drizzle 0.45.4 / kit 0.31 · pg 8.23 · PGlite 0.5.16 · helmet 8.3
  · swagger 12.1 · Tailwind 4.3.5 · shadcn 4.23. CI actions pinned by SHA (ci.yml comments).

## Log files

- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session; build 0.0–0.2
- [progress/log-2026-11-15.md](progress/log-2026-11-15.md) — build 0.3–0.6 (deploy)
- [progress/decisions-archive.md](progress/decisions-archive.md) — older "Decisions taken"
