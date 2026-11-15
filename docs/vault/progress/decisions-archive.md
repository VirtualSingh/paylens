---
title: Decisions taken — archive (moved out of progress.md to keep it short)
updated: 2026-11-15
---

# Decisions taken — archive

Older entries from [../progress.md](../progress.md) → "Decisions taken". Nothing here is
superseded unless it says so; ADRs hold the full reasoning.

## 2026-11-14

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

## 2026-11-15 (moved from progress.md in the evening)

- DB driver: `pg` (node-postgres) + Drizzle over Neon's pooled URL, 5 s statement_timeout;
  tests inject PGlite behind the same `Database` type (DATABASE token).
- a11y tests call axe-core directly (5-line helper) instead of vitest-axe (no release since 2022).
- shadcn/ui initialised (config, `@/` alias, cn, colours mapped onto ui.md tokens); primitives
  are added with their first feature — no unused, untested vendored code in the history.
- 5xx responses never carry the exception message; logs keep stack frames but drop the message
  line (it can quote emails or connection strings).
- Extensions are enabled by migration 0000 (not a docker init script), so Neon, docker and the
  PGlite harness all get them the same way; the harness applies migrations.
- **No `Co-Authored-By` trailers in commit messages** (Pushpendra). Commits up to `22d481a` keep
  theirs: removing them would need a history rewrite + force push (CLAUDE.md forbids).
- CI bundle-size check (deployment.md) deferred to the Phase 4 performance pass.
- D-1 closed: React ecosystem (Pushpendra: the recruiter is not expected to reply).
- Region Singapore for both Neon (aws-ap-southeast-1) and Vercel functions (sin1).
- Two DB roles: migrations as owner over the direct URL; the API as `paylens_app` (DML only,
  5 s timeout) over the pooler. Secrets go shell variable → Vercel, never to disk.
- API on Vercel via a plain-JS function over our tsc build, not the NestJS preset (ADR-011
  addendum). Web adds CSP/HSTS/etc. in vercel.json; `/api` rewritten (ADR-008).
- Vercel projects created with the CLI's `vercel api` (the MCP lacks scope on the hobby team).
