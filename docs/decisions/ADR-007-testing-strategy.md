# ADR-007 — Test with Vitest everywhere, real SQL on PGlite, and a visible TDD cadence

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
The brief wants meaningful, fast, deterministic tests; the employer is a TDD shop that reads
commit history. Analytics correctness depends on SQL, which mocks cannot verify. Tests must
run without Docker so reviewers and CI can run them anywhere.

## Options considered
1. Jest for Nest, Vitest for web — two runners, two configs; Nest 12 moved to Vitest anyway.
2. **Vitest everywhere**; SQL tests on **PGlite** (embedded Postgres in WASM) — one runner,
   real Postgres semantics, no services in CI.
3. Testcontainers Postgres — real server, needs Docker; slower startup.
4. Mock the repository layer only — fast but blind to SQL mistakes.

## Decision
Option 2 with a pyramid: pure domain (most) → services with in-memory fakes → repositories/
SQL on PGlite → a few supertest API tests → Testing Library components with axe → 3 Playwright
journeys. Fixed clock and seeded randomness everywhere; no network. Commit per red-green-
refactor cycle with conventional messages; pre-commit runs lint + affected tests.

## Consequences
- Positive: `pnpm test` works offline in < 60 s; SQL is tested for real; history reads as TDD.
- Negative: PGlite may lag Postgres on extensions — `btree_gist` must be verified in Phase 0;
  fallback is Testcontainers for repository specs only (keeps unit gate Docker-free).
- Follow-ups: coverage 100% on `libs/domain`, ≥ 80% overall; Stryker on domain as stretch.

## Links
docs/vault/design/testing.md · CLAUDE.md (Testing standards)
