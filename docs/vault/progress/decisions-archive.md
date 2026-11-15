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
