---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-14
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-14 evening)

- Planning complete: product, design and plan written; vault created. No code yet.
- Repo: to be created by Pushpendra on GitHub (empty); then the vault is the first commit.
- Deployed: nothing yet. Phase 0 ends with a deployed walking skeleton.
- Frontend framework: **React (default)**. Recruiter asked whether Angular is acceptable;
  answer expected 2026-11-15. If allowed, switch per ADR-003 before Phase 2.3.
- Test runner: Vitest everywhere (NestJS 12 default). DB in tests: PGlite — verify
  `btree_gist` support in Phase 0 task 0.3 before relying on it.

## Now (next 3 steps)

1. Phase 0 · 0.0 — bootstrap the machine (Node, pnpm, git identity, GitHub repo) and record versions below.
2. Phase 0 · 0.1–0.3 — commit vault + requirements doc (docs before code), Nx workspace, first TDD cycles.
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
| D-4 | Repo public or private | Public | Pushpendra | 2026-11-15 |
| D-5 | Commit directly to `main` with CI vs PR flow | `main` with CI (history is the artefact) | Pushpendra | 2026-11-15 |

## Decisions taken (short; ADR has the reasoning)

- 2026-11-14 · Stack: Nx + NestJS 12 + Drizzle/Postgres (Neon) + React/Vite (default) + Vercel. ADR-001/002/003/008.
- 2026-11-14 · Money as bigint minor units with dated FX and reporting currency. ADR-004.
- 2026-11-14 · Effective-dated, append-only salary history with DB exclusion constraint. ADR-005.
- 2026-11-14 · Google Sign-In + server-side sessions; roles admin/hr_manager/viewer; demo mode. ADR-006.
- 2026-11-14 · Vitest + PGlite + TDD cadence. ADR-007.
- 2026-11-14 · Assistant: Mastra, tools-only, aggregate-first, evals in CI. ADR-009.
- 2026-11-14 · Out of scope list incl. micro-frontends and Chrome extension. ADR-010.

## Blockers

- None. (GitHub repo, Vercel and Neon accounts needed before 0.1 / 0.6.)

## Review notes from Pushpendra (agent addresses these first)

- (empty)

## Useful facts (no secrets)

- Live URLs: web = _tbd_, api = _tbd_. Vercel project ids: _tbd_. Neon project: _tbd_.
- Seed timing: local _tbd_, Neon _tbd_.
- Versions pinned at scaffold time: _record here_ (Node, pnpm, Nx, Nest, React/Angular, Drizzle, Mastra).

## Log files

- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session
