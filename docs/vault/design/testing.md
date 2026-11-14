---
title: Testing — pyramid, harnesses, TDD cadence, coverage
updated: 2026-11-14
status: active
---

# Testing

The brief asks for tests that are meaningful, fast, deterministic and easy to understand,
and a commit history that shows the solution evolving. Incubyte reads commit history for
TDD discipline. This file makes both happen.

## TDD cadence (visible in `git log`)

For every behaviour:
1. `test(scope): <behaviour in plain English>` — a failing test (or the test lands with the
   minimal implementation in one `feat:` commit; either is fine, but the test is written first).
2. `feat(scope): <behaviour>` — the simplest code that passes.
3. `refactor(scope): <what and why>` — behaviour unchanged, tests still green.
Commit at the end of each cycle. Small commits (< 300 lines changed) beat big ones. Never
commit red. Pre-commit hook runs lint + affected tests; CI runs everything.

Example sequence for F-09 (salary change):
```
test(domain): rejects salary change dated before current record
feat(domain): salary change validation rules
test(salaries): closes current record and inserts new one in a transaction
feat(salaries): SalaryChangeService.change
test(api): POST /employees/:id/salary-changes returns 201 with band metrics
feat(api): salary-changes endpoint with If-Match
refactor(salaries): extract EffectivePeriod value object
test(web): change-salary sheet previews delta and compa-ratio
feat(web): SalaryChangeSheet
```

## Pyramid and harnesses

| Layer | Where | Harness | Speed target |
|---|---|---|---|
| Domain (most tests) | `libs/domain` | Vitest, pure functions, fixed `Clock` injected | < 2 s |
| Service | `apps/api/src/**/*.service.spec.ts` | Vitest + in-memory fakes implementing repository interfaces | < 5 s |
| Repository / SQL | `apps/api/src/**/*.repository.spec.ts`, `analytics/*.sql.spec.ts` | **PGlite** (embedded Postgres) with migrations applied once per file; `TRUNCATE … RESTART IDENTITY` between tests; extensions `btree_gist`, `pg_trgm`, `citext` loaded | < 20 s |
| API | `apps/api/src/**/*.e2e-spec.ts` | Nest testing module + supertest over PGlite; Google verifier faked; fixed clock | < 20 s |
| UI components | `apps/web/src/**/*.spec.tsx` | Vitest + Testing Library + `vitest-axe`; API mocked with MSW | < 15 s |
| Journeys | `apps/web-e2e` | Playwright against `pnpm dev` with a seeded small DB; 3 journeys | not in the unit gate |

Whole unit/integration gate: < 60 s locally, parallel in CI.

## Determinism rules

- Time: `Clock` interface (`now(): Date`) injected everywhere; tests fix it.
- Randomness: seeded `faker` (`faker.seed(42)`); ids from fixtures, not `Math.random`.
- Network: none. Google token verification behind an interface with a fake. LLM behind
  Mastra's mock model.
- Order independence: each test builds its own data; no shared mutable fixtures.
- No sleeps/`setTimeout` waits; use fake timers or awaited promises.

## Test data builders

`libs/domain/testing` exports builders: `anEmployee({...})`, `aSalary({...})`,
`aBand({...})`, `anFxRate({...})`, returning valid defaults you override. SQL tests use a
12-employee "mini-ACME" fixture with hand-computed expected metrics in a table at the top
of the spec so a reader can verify by eye.

## What must be tested (acceptance list)

- Money: minor-unit arithmetic, formatting per currency, conversion rounding (half-even),
  rate derivation, "rate unavailable" path.
- Effective dating: no overlaps (service + DB constraint), future-dated records, corrections.
- Band math: compa-ratio, penetration, position at boundaries (== min, == max).
- Directory query: each filter, each sort, pagination bounds, unknown sort → 400, `q` trigram.
- Authorization: matrix test — every role × every mutating route, plus viewer masking.
- Auth: valid/expired/wrong-audience tokens; session expiry; logout revocation; demo gating.
- Audit: every mutation writes exactly one event with before/after; append-only (UPDATE fails).
- Analytics: hand-computed expected values on the mini fixture (summary, breakdown,
  percentiles, band positioning, pay gap with suppression, trend across a boundary).
- Import: mapping detection, row errors, dry run, transactional commit, CSV injection escape.
- Assistant: tool gating by role, refusal, truncation notice, output filter, caps.
- UI: directory renders rows and masks for viewers; change-salary preview math; a11y (axe) on each page component; empty/error states.
- Journeys (Playwright): demo sign-in → find employee → record salary change → see it in history and audit;
  viewer sign-in → no salary columns, dashboard loads; import a 50-row CSV → commit → directory shows rows.

## Coverage and quality gates

- Coverage: `libs/domain` 100% statements/branches (it is pure logic); overall ≥ 80%.
  Coverage is a smoke alarm, not the goal; no tests written to "hit lines".
- Lint: ESLint flat config + `typescript-eslint` strict, `eslint-plugin-security`, Nx module
  boundaries; Prettier.
- Typecheck: `tsc --noEmit` per project in CI.
- Stretch: Stryker mutation testing on `libs/domain` (score ≥ 85%).

## Performance checks (Phase 4)

A small script (`tools/perf/directory-p95.ts`) hits the directory and analytics endpoints
locally against the seeded DB and prints p50/p95; results and `EXPLAIN ANALYZE` excerpts go
to `docs/perf.md`. Not a CI gate (noisy), but a committed artefact.
