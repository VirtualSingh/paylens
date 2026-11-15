---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-15
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-15, session paused by Pushpendra for a few hours)

- Phase 0: 0.0–0.4 done; 0.5 CI workflow written and pushed but **has never run** — GitHub
  refuses to start jobs ("account is locked due to a billing issue"). 0.6 not started.
- Repo: https://github.com/VirtualSingh/paylens (public), working directly on `main`.
  Working tree clean; everything pushed.
- Locally green: domain 2 · shared 11 · api 20 (incl. PGlite) · web 10 tests, lint,
  typecheck, build, Prettier, `pnpm audit --prod` (0 known vulns); 1 Playwright smoke.
- `pnpm dev` verified: web :4200, API via the Vite proxy, `/health/ready` 503 without a DB.
- Claude Code restarted (2026-11-15): nx-mcp connected and answering; **vercel and neon MCP
  servers await OAuth** — Pushpendra runs `/mcp` in the Claude Code panel and signs in to both.
- Docker Desktop 29.9.3 + Compose v5.7 installed: `docker compose up -d --wait db` →
  `pnpm db:migrate` applied migration 0000 (btree_gist, citext, pg_trgm) → `/health/ready` 200.
- Frontend framework: **React — final** (D-1 closed by Pushpendra; ADR-003 updated).
- Known issue: api suite ~20 s wall clock; `--no-isolate` measured at 12.6 s (not applied yet).

## Now (next 3 steps)

1. Pushpendra: unlock GitHub *account* billing (see Blockers) — still locked at run
   43680916033 (aab7c68) after Actions were enabled on the repo. Then re-run CI, fix anything red.
2. Phase 0 · 0.6 — create Neon project + Vercel projects, deploy, run `pnpm db:migrate`
   against Neon, record URLs here. CLIs are signed in (vercel: virtualsingh, hobby team
   `virtualsinghs-projects`; neon: Pushpendra); MCP tools load after the pending restart.
3. Phase 0 exit check: `pnpm test` time on a quiet machine (api now `isolate: false`, aab7c68).

## Next (this phase)

- Branch protection: decide after D-5 (requiring checks on `main` blocks direct pushes).
- README skeleton with live URL, badges and the 5-minute local path (part of 0.6).

## Later (next phase)

- Phase 1: domain lib → schema + exclusion constraints → repositories → seed → employees API.

## Decisions pending (humans only)

| # | Decision | Default if no answer | Owner | Due |
|---|---|---|---|---|
| ~~D-1~~ | ~~Frontend: React vs Angular~~ — answered: React (no recruiter reply expected) | React | Pushpendra (recruiter) | 2026-11-15 |
| D-2 | Gender in data model for pay-gap (F-22) | Include, optional field, suppression n<5 | Pushpendra | 2026-11-15 |
| D-3 | Assistant model for the demo: Claude Haiku (~$5) vs Gemini Flash-Lite (free) | Provider-neutral code; demo on Gemini Flash-Lite if no key is funded by Phase 4 | Pushpendra | 2026-11-17 |
| ~~D-4~~ | ~~Repo public or private~~ — answered: Pushpendra created the repo public | Public | Pushpendra | 2026-11-15 |
| D-5 | Commit directly to `main` with CI vs PR flow (working on `main` meanwhile; switching later costs nothing) | `main` with CI (history is the artefact) | Pushpendra | 2026-11-15 |

## Decisions taken (short; ADR has the reasoning)

- 2026-11-14 · Stack: Nx + NestJS 12 + Drizzle/Postgres (Neon) + React/Vite (default) + Vercel. ADR-001/002/003/008.
- 2026-11-14 · Money as bigint minor units with dated FX and reporting currency. ADR-004.
- 2026-11-14 · Effective-dated, append-only salary history with DB exclusion constraint. ADR-005.
- 2026-11-14 · Google Sign-In + server-side sessions; roles admin/hr_manager/viewer; demo mode. ADR-006.
- 2026-11-14 · Vitest + PGlite + TDD cadence. ADR-007.
- 2026-11-14 · Assistant: Mastra, tools-only, aggregate-first, evals in CI. ADR-009.
- 2026-11-14 · Out of scope list incl. micro-frontends and Chrome extension. ADR-010.
- 2026-11-14 · D-4 public: the repo already existed as public (`VirtualSingh/paylens`).
- 2026-11-14 · Node 24 everywhere (`.nvmrc`, CI, Vercel), not 22: design.md says "22 LTS+";
  24 is already installed, is Vercel's default runtime and is supported longer.
- 2026-11-14 · `neon` CLI 9.x instead of `neonctl`: it is the successor (same commands) and
  was already installed globally; installing `neonctl` would clash on the `neon` shim.
- 2026-11-14 · Requirements doc committed *before* the vault so it is the first commit a
  reviewer sees.
- 2026-11-14 · MCP restart deferred from 0.0 to 0.6: only 0.6 needs Vercel/Neon, so the
  restart and both browser logins become one interruption instead of two.
- 2026-11-14 · Nx 24 (not 23 as planned — current release). API on NestJS 12 as ESM built with
  plain `tsc` (ADR-011); the generator's Nest 11 + webpack/CommonJS output was replaced.
  ESLint stays on 9 (what Nx 24's plugins support).
- 2026-11-14 · Pre-commit runs lint + typecheck + test for affected projects (not just lint):
  "every commit must build and pass tests" is enforced, not hoped for.
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

## Blockers

- **GitHub Actions will not start any job: "account is locked due to a billing issue".**
  Needs Pushpendra at https://github.com/settings/billing (resolve the payment/spending
  issue). Public repos normally run Actions free. Until then "CI green" cannot be shown.
- ~~Docker not installed~~ — resolved 2026-11-15 (Docker Desktop 29.9.3).
- ~~Vercel and Neon MCP OAuth~~ — done by Pushpendra 2026-11-15; tools appear after a restart.

## Review notes from Pushpendra (agent addresses these first)

- (empty)

## Useful facts (no secrets)

- Live URLs: web = _tbd_, api = _tbd_. Vercel project ids: _tbd_. Neon project: _tbd_.
- Seed timing: local _tbd_, Neon _tbd_.
- Machine (0.0): Windows 11 Home 10.0.26200 · Git Bash + PowerShell 5.1 · Node 24.21.0 ·
  npm 11.19.0 · pnpm 12.18.0 (npm -g; corepack needs admin to write into Program Files) ·
  git 2.37.0 · gh 2.102.0 (logged in as VirtualSingh) · vercel 65.16.0 · neon 9.5.0 ·
  Docker Desktop 29.9.3 + Compose v5.7.0 · Claude Code 2.1.325 (VS Code extension).
- MCP (project scope, `.mcp.json`): vercel (http), neon (http), nx-mcp (stdio via `cmd /c npx`).
- Scaffold (0.2): Nx 24.0.0 · NestJS 12.5.0 · React 19.3.1 · Vite 8.3.8 · Vitest 5.0.5 ·
  TypeScript 6.0.3 · ESLint 9.39.5 + typescript-eslint 8.72.2 · Playwright 1.65.0 ·
  Prettier 3.10.1. Added in 0.3–0.4: Zod 4.6 · Drizzle 0.45.4 + drizzle-kit 0.31.11 ·
  pg 8.23 · PGlite 0.5.16 · helmet 8.3 · @nestjs/swagger 12.1 · Tailwind 4.3.5 ·
  shadcn 4.23 (radix-nova). Later: Mastra.
- CI actions pinned (0.5): checkout v7.0.1 · setup-node v7.1.0 · pnpm/action-setup v6.1.1 ·
  cache v6.1.0 · upload-artifact v7.0.2 · gitleaks-action v3.0.0 · osv-scanner-action v2.7.1.

## Log files

- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session; build session 0.0–0.2
- [progress/log-2026-11-15.md](progress/log-2026-11-15.md) — build session 0.3–0.5
