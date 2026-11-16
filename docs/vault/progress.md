---
title: Progress — rolling window (keep ≤ 120 lines; details go to progress/log-*.md)
updated: 2026-11-16
status: active
---

# Progress

Read this first every session. Keep it short: what is true now, what is next, what is
blocked, what needs a human. Move detail to the dated log. When this file passes 120 lines,
archive "Decisions taken" into `progress/decisions-archive.md` and trim.

## Current state (as of 2026-11-16)

- **Phases 0–2 done** (Phase 2's remaining exit items need Pushpendra: actions file). Phase 3
  started: analytics summary and breakdown (exact, per-person FX; hand-checked quartiles). Sign-in is behind `AUTH_ENABLED` (ADR-014), **off** in production:
  the live site opens as the demo HR manager; "Viewing as" switches role. On = Google sign-in.
- API: people, pay, bands, FX, audit log (`GET /audit`, `/employees/:id/audit`); every route
  in the role × endpoint matrix (69 cases); OpenAPI 3.1 committed and drift-tested.
- Web: shell (search, ⌘K palette, reporting currency, "Viewing as"), directory (URL state, server
  sort/filters/paging, band bars, viewer masking), profile (pay on the band, history, details,
  audit, history chart), sheets: change salary (domain preview, warnings, If-Match), status
  (typed-code termination), add employee, edit details. Checked live in Chromium.
- Neon production: 4 migrations (0003: sessions + demo users), 10,000 employees. Vercel api:
  `AUTH_ENABLED=false`, `GOOGLE_CLIENT_ID` set.
- Tests 453 green: domain 86 (100% coverage) · shared 70 · api 229 · web 68. CI green.

## Now (next 3 steps)

1. Phase 3.1 analytics, continued: band positioning (points for HR, counts for viewers),
   outliers, 24-month trend, pay gap with n<5 suppression, 60 s memo, CSV export.
2. Phase 3.3 dashboard on summary + breakdown (KPI tiles, payroll by country, median by level).
3. D-8 (CSP vs runtime styles) as soon as Pushpendra answers — see actions-for-pushpendra.md.

## Next (this phase)

- Google sign-in on the live site, once (flip `AUTH_ENABLED=true`, sign in, flip back) to tick
  the Phase 2 exit; rate limiting on /auth (Phase 4).
- Api suite under 40 s (per-file PGlite + Nest boot dominate).

## Later (next phases)

- Phase 3 analytics + import; Phase 4 AI + hardening: directory sort by reporting salary
  ~640 ms at 10k (target p95 300 ms); CI bundle-size check.

## Decisions pending (humans only)

Every action waiting on Pushpendra, with steps: [actions-for-pushpendra.md](actions-for-pushpendra.md).

| # | Decision | Default if no answer | Owner | Due |
|---|---|---|---|---|
| D-3 | Assistant model for the demo: Claude Haiku (~$5) vs Gemini Flash-Lite (free) | Provider-neutral code; demo on Gemini Flash-Lite if no key is funded by Phase 4 | Pushpendra | 2026-11-17 |
| D-8 | Live CSP blocks runtime `<style>` blocks (sonner toasts, Radix scroll lock) → toasts unstyled. Allow inline styles, or pin the 3 hashes? | Pin the hashes (stays strict; update on library upgrades) | Pushpendra | 2026-11-17 |

D-1, D-2, D-4, D-5 are closed (React; gender female/male; public repo; `main` with CI);
D-6 closed 2026-11-16: the Google OAuth client exists (JavaScript origins only, no redirect
URIs — the ID-token flow) — see [progress/decisions-archive.md](progress/decisions-archive.md).

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
- 2026-11-16 · Sign-in flag (ADR-014): off by default; demo users (migration 0003) act for
  visitors via `x-acting-role`; on = Google ID token → hashed session, `__Host-` cookie.
  D-7 closed: sign-in built behind the flag.
- 2026-11-16 · TanStack Table pinned to 8 (v9 changed its hook API; the table is server-side).
  React Router 8 (current; the plan said 7 — same data-router API).
- 2026-11-16 · Filters are one native select each for now (accessible, URL already multi-value);
  multi-select popovers later. Managers are entered by employee code, resolved by search.
- 2026-11-16 · The web may import libs/domain (boundary rule widened) so previews run the
  server's band maths; display formatting stays in the web (`formatMoney`).

## Blockers

- (none) — sign-in is parked by choice (D-7), not blocked.

## Review notes from Pushpendra (agent addresses these first)

- 2026-11-15 · Asked for a status report (UI unchanged, CI red, slow pace). Answered; he chose
  to finish Phase 1 before starting the UI. Keep CI green and say what is user-visible.
- 2026-11-16 · "Leave login logout as of now, build everything else" — done for 2.2–2.6.

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
- [progress/log-2026-11-16.md](progress/log-2026-11-16.md) — Phase 2 without sign-in
- [progress/decisions-archive.md](progress/decisions-archive.md) — older "Decisions taken"
