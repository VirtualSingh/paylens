---
title: Phase 1 — Domain + data (money, bands, schema, seed, employees & salary API)
updated: 2026-11-15
status: done (2026-11-15)
window: 2026-11-15 → 2026-11-16
---

# Phase 1 — Domain + data

**Goal:** the hard, testable core: money and FX math, band metrics, effective-dated
salaries, a schema whose constraints enforce the rules, a 10,000-employee seed, and the
employees/salary REST API — all test-first.
**Entry:** Phase 0 exit checklist green.

## Tasks

### 1.1 Domain library — pure TypeScript, 100% coverage (≈ 3 h)
TDD order (one cycle per bullet; commit each):
- `Money`: construct from minor units, `add`, `subtract`, `multiplyRatio` (half-even
  rounding), `format(locale)`, mismatched-currency error, negative not allowed for salaries.
- `annualize(amountMinor, frequency)` with factors `{ annual: 1, monthly: 12 }`.
- `FxTable` + `convert(money, to, asOf)`: picks latest rate `as_of <= asOf`, derives cross
  rates via USD, decimal math via `big.js`, returns `{ money, rate, asOf }` or `Unavailable`.
- `bandMetrics(annualLocal, band)`: compa-ratio, range penetration, position incl. boundaries.
- `EffectivePeriod` and `planSalaryChange(current, cmd, clock)`: validates `effectiveFrom`
  after current start, amount > 0, currency = country currency, reason required; returns the
  close + insert plan; `correction` path re-slices history (pure function over the list).
- `csvRowSchema` (Zod) for import rows + `normalizeRow` (trim, currency upper-case, date parse).
- Builders in `libs/domain/testing`.
Acceptance: `pnpm nx test domain --coverage` = 100% statements/branches; < 2 s.

### 1.2 Schema and migrations (≈ 2 h)
- Drizzle schema per [../design/data-model.md](../design/data-model.md): enums, tables,
  checks, **exclusion constraints** (custom SQL in the migration, since Drizzle may not model
  them — keep schema and migration in sync with a test that introspects the constraint).
- Indexes with justification comments. Views `current_salaries`, `employee_comp`.
- Migration test on PGlite: apply all → insert overlapping salary → expect constraint error;
  insert band with `min > mid` → check error; `citext` email uniqueness case-insensitive.
- DB roles script (`db/roles.sql`) for Neon (app vs migrator) — applied manually, documented.
Commits: `test(db): overlapping salary periods are rejected by the database` → `feat(db): initial schema, constraints, indexes and views`.

### 1.3 Repositories (≈ 2 h)
- `EmployeesRepository`: `search(params)` (filters allowlist, trigram `q`, sort allowlist,
  paging, returns `total`), `findById`, `insert`, `update(expectedVersion)` → optimistic lock.
- `SalaryRepository`: `currentFor(employeeId)`, `history(employeeId)`, `closeAndInsert(tx, plan)`.
- `PayBandsRepository`, `FxRepository`, `AuditRepository.append(tx, event)` (and a test that
  UPDATE on `audit_events` fails for the app role — simulate with a `REVOKE` in PGlite).
- Each repository has a PGlite spec with a 12-employee fixture (`mini-acme.ts`) and
  hand-computed expectations.

### 1.4 Seed generator (≈ 2 h)
- `generateAcme({ size, seed, asOf })` pure function per [../design/seed.md](../design/seed.md);
  `generate.spec.ts` asserts distributions on 2,000 rows (shares ±2%, outlier share, no
  overlaps, currency/country consistency, unique codes, manager same country).
- Batched inserter; CLI with `--size`, `SEED_CONFIRM`, `SEED_FORCE`; `db:seed` and
  `db:reset-demo` scripts. Run locally against Docker: 10,000 in < 30 s. Record timing in `progress.md`.
Commits: `test(seed): generated org matches target distributions` → `feat(seed): deterministic 10k employee generator` → `feat(seed): batched inserter and cli`.

### 1.5 Employees and salary API (≈ 3 h) — behind a temporary `X-Dev-Role` header until Phase 2 auth lands (removed in 2.1; never deployed with it enabled: guarded by `NODE_ENV !== 'production'`)
- `GET /employees` with filters/sort/paging; 400 on unknown sort; envelope; p95 check later.
- `GET /employees/:id` with current comp + band metrics (service composes domain + repos).
- `POST /employees` (with initial salary), `PATCH /employees/:id` with `If-Match`/409.
- `GET /employees/:id/salary-history`, `POST /employees/:id/salary-changes` (transaction,
  audit event, returns metrics), `POST /employees/:id/status`.
- Reference endpoints: countries, departments, job-levels, job-families, pay-bands (GET), fx-rates (GET).
- Problem+json for every error path; OpenAPI annotations; `docs/api/openapi.json` generated and committed.
Commits follow the F-09 example in [../design/testing.md](../design/testing.md).

### 1.6 Deploy the real schema (≈ 30 min)
- Run migrations on Neon (direct URL), seed production with the full 10,000, redeploy API;
  hit `/api/v1/employees?page=1` on the live URL (still dev-role guarded → expect 403 in prod,
  proving the guard). Record seed time against Neon.

## Exit checklist

- [x] Domain 100% covered; no network · [ ] whole suite < 40 s (api 41.8 s — carried into Phase 2)
- [x] DB rejects overlapping periods and invalid bands (tests prove it)
- [x] 10,000 employees seeded locally (27.7 s) and on Neon (21.9 s); `generate.spec` distribution assertions green
- [x] Employees/salary endpoints documented in OpenAPI (`docs/api/openapi.json`); `git log` shows test → feat → refactor cycles
- [x] ADR-004 (money), ADR-005 (effective dating) written (+ ADR-013 employee lifecycle); `progress.md` updated

## Notes for the agent

- Resist building analytics early; Phase 3 needs the auth + audit from Phase 2 first.
- Keep SQL readable: CTEs with names, one query per read model, comments on why an index exists.
- If Drizzle's exclusion-constraint support is awkward, write the constraint in the migration SQL
  and add an introspection test; do not drop the constraint.
