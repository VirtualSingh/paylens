---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-14
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-14 night)

- Phase 0 in progress: 0.0 (machine), 0.1 (docs-first commits) and 0.2 (Nx workspace,
  strict TS, lint boundaries, commit hooks) done. Next: 0.3 first TDD cycles.
- Repo: https://github.com/VirtualSingh/paylens (public), working directly on `main`.
- MCP servers (vercel, neon, nx-mcp) are in `.mcp.json` but load only after a Claude Code
  restart — requested together with the Vercel/Neon browser logins at task 0.6.
- Deployed: nothing yet. Phase 0 ends with a deployed walking skeleton.
- Frontend framework: **React (default)**. Recruiter asked whether Angular is acceptable;
  answer expected 2026-11-15. If allowed, switch per ADR-003 before Phase 2.3.
- Test runner: Vitest everywhere (NestJS 12 default). DB in tests: PGlite — verify
  `btree_gist` support in Phase 0 task 0.3 before relying on it.

## Now (next 3 steps)

1. Phase 0 · 0.3 — first TDD cycles (Money.add, PaginationQuerySchema, health, shell, PGlite).
2. Phase 0 · 0.4–0.5 — local infra + `.env.example`; CI with security scans.
3. Phase 0 · 0.6 — walking skeleton on Vercel + Neon; record URLs here.

## Next (this phase)

- 0.4 local infra and `.env.example`; 0.5 CI with security scans.

## Later (next phase)

- Phase 1: domain lib → schema + exclusion constraints → repositories → seed → employees API.

## Decisions pending (humans only)

| # | Decision | Default if no answer | Owner | Due |
|---|---|---|---|---|
| D-1 | Frontend: React vs Angular | React | Pushpendra (recruiter) | 2026-11-15 |
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
  plain `tsc` (mirrors the official `nest new` v12 template); the Nx generator's Nest 11 +
  webpack/CommonJS output was replaced. ESLint stays on 9 (what Nx 24's plugins support).
- 2026-11-14 · Pre-commit runs lint + typecheck + test for affected projects (not just lint):
  "every commit must build and pass tests" is enforced, not hoped for.

## Blockers

- Docker not installed (admin install): https://docs.docker.com/desktop/setup/install/windows-install/
  Needed for the local `docker compose` Postgres (0.4 can be written without it) and as the
  test fallback only if PGlite lacks an extension. Not blocking today.

## Review notes from Pushpendra (agent addresses these first)

- (empty)

## Useful facts (no secrets)

- Live URLs: web = _tbd_, api = _tbd_. Vercel project ids: _tbd_. Neon project: _tbd_.
- Seed timing: local _tbd_, Neon _tbd_.
- Machine (0.0): Windows 11 Home 10.0.26200 · Git Bash + PowerShell 5.1 · Node 24.21.0 ·
  npm 11.19.0 · pnpm 12.18.0 (npm -g; corepack needs admin to write into Program Files) ·
  git 2.37.0 · gh 2.102.0 (logged in as VirtualSingh) · vercel 65.16.0 · neon 9.5.0 ·
  Docker: absent · Claude Code 2.1.325 (VS Code extension).
- MCP (project scope, `.mcp.json`): vercel (http), neon (http), nx-mcp (stdio via `cmd /c npx`).
- Scaffold (0.2): Nx 24.0.0 · NestJS 12.5.0 · React 19.3.1 · Vite 8.3.8 · Vitest 5.0.5 ·
  TypeScript 6.0.3 · ESLint 9.39.5 + typescript-eslint 8.72.2 · Playwright 1.65.0 ·
  Prettier 3.10.1. Later: Drizzle, Mastra (record when added).

## Log files

- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session
