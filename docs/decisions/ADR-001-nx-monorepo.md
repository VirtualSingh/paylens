# ADR-001 — Use an Nx monorepo with separate api, web, domain and shared projects

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
One reviewer-facing repository must hold a NestJS API, a web app, pure domain logic and
shared contracts, with tests and CI that stay fast as the code grows. The backend and
frontend must be independently deployable (two Vercel projects). The agent building it
benefits from generators and a project graph (Nx has an official MCP server).

## Options considered
1. Two separate repositories — clean boundaries; but two histories, duplicated contracts, slower reviews.
2. pnpm workspaces + Turborepo — minimal config; no generators, weaker enforced boundaries.
3. Nx integrated monorepo — generators for Nest/React/Angular, enforced module boundaries,
   affected-only CI, caching; more configuration surface.

## Decision
Nx 23 integrated monorepo, pnpm, with `apps/api`, `apps/web`, `apps/web-e2e`,
`libs/domain` (framework-free), `libs/shared` (Zod contracts). Module-boundary lint rules:
`web→shared`, `api→shared,domain`, `domain→∅`.

## Consequences
- Positive: one commit history tells the whole story; one Zod schema serves API and UI;
  `nx affected` keeps CI fast; the frontend framework can be swapped (ADR-003) without
  touching anything else.
- Negative: Nx config has a learning curve; version churn. Mitigation: use generators,
  record versions in `progress.md`, avoid custom executors.
- Follow-ups: keep `libs/domain` free of any framework import (lint rule + review).

## Links
docs/vault/design/architecture.md · ADR-002 · ADR-003
