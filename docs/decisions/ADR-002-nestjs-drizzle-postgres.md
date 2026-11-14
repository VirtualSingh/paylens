# ADR-002 — Use NestJS 12 with Drizzle ORM on PostgreSQL (Neon in production)

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
The role is TypeScript backend + AI; the brief allows any backend framework and a
relational database. Pushpendra's mental model is Angular (modules, DI, decorators,
guards, interceptors), and he must defend the code in interviews. Analytics need real SQL
(window functions, `percentile_cont`), constraints must protect salary history, and tests
must be fast and deterministic without Docker.

## Options considered
1. **NestJS** — Angular-like architecture, first-class testing module, OpenAPI, guards/
   interceptors; v12 brings ESM, Vitest and native Zod validation. Heavier than Fastify/Hono.
2. Express/Fastify + hand-rolled structure — lighter; more decisions to justify, less structure for a reviewer.
3. Next.js full-stack — one deploy; unfamiliar to the candidate; UI constraint still React.

Data layer: **Drizzle** (SQL-shaped, schema in TS, PGlite driver, no codegen) vs Prisma
(most popular, schema DSL, serverless adapters) vs TypeORM (Nest default docs, dated).
Database: Postgres (constraints, exclusion, percentiles) vs SQLite (brief's example; weaker for multi-currency analytics).

## Decision
NestJS 12 (ESM) + Drizzle ORM 0.45 (stable; 1.0 is RC) + PostgreSQL. Production on Neon
(free, official MCP, scale-to-zero with automatic resume); local via Docker; tests on PGlite.

## Consequences
- Positive: candidate can explain every layer; SQL stays visible and testable; constraints
  enforce invariants; PGlite gives real-Postgres tests in-process.
- Negative: Drizzle has fewer tutorials than Prisma; Neon free tier has cold starts
  (sub-second to a few seconds). Accepted and documented in README.
- Follow-ups: verify PGlite supports `btree_gist` in Phase 0; revisit Drizzle 1.0 after GA.

## Links
docs/vault/design/data-model.md · docs/vault/design/testing.md · ADR-004 · ADR-005 · ADR-008
