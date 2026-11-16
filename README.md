# PayLens

Salary management for ACME's HR manager: 10,000 employees across eight countries, an
effective-dated pay history that is never overwritten, and answers to "how does the
organisation pay people?" that show their working.

[![CI](https://github.com/VirtualSingh/paylens/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/VirtualSingh/paylens/actions/workflows/ci.yml)

**Live:** https://paylens-web-black.vercel.app · API health:
https://paylens-web-black.vercel.app/api/v1/health/ready · API docs:
https://paylens-web-black.vercel.app/api/docs

> The database scales to zero when idle: the first request after a quiet spell can take a
> few seconds while it wakes; the next ones are fast.

> Status: Phase 2 of 5. The API for people, pay, bands, FX and the audit log is complete
> ([OpenAPI](docs/api/openapi.json)); the web app has the directory, profiles, the
> change-salary sheet and add / edit / status. **Sign-in is not built yet**, so the live site
> answers "sign in to continue": run it locally to use it (below). What is being built and in
> which order: [`docs/requirements.md`](docs/requirements.md) and
> [`docs/vault/plan.md`](docs/vault/plan.md).

## Run it locally (about 5 minutes)

Prerequisites: Node 24 (`.nvmrc`), pnpm 12 (`npm i -g pnpm`), Docker.

```bash
git clone https://github.com/VirtualSingh/paylens.git && cd paylens
pnpm install
cp .env.example .env                 # local defaults; no secrets needed
docker compose up -d --wait db       # Postgres 17 on :5432
pnpm db:migrate                      # applies apps/api/src/db/migrations
pnpm db:seed                         # 10,000 generated employees (about 30 s)
pnpm dev                             # web on http://localhost:4200, API proxied at /api
```

Check: http://localhost:4200/people lists 10,000 people, and
http://localhost:4200/api/v1/health/ready answers `{"status":"ok","checks":{"database":"up"}}`.
Until sign-in exists, development builds act as the role chosen in the top bar ("Acting as");
switch to Viewer to see individual pay disappear. Production builds never send that role.

## Tests

```bash
pnpm test        # every project; no Docker, no network (the API tests use in-process Postgres)
pnpm lint        # ESLint, including architecture boundaries between apps and libs
pnpm typecheck
pnpm nx e2e web-e2e   # Playwright journeys (starts the dev server itself)
```

The commit history is written test-first: each behaviour lands as a failing test plus the
smallest change that passes it, then refactors. `git log --oneline` reads as that story.

Tests worth reading first:

- **Who may do what** —
  [`authorization-matrix.e2e-spec.ts`](apps/api/src/auth/authorization-matrix.e2e-spec.ts):
  every route × anonymous / viewer / HR manager / admin → 401, 403 or success, and exactly
  one audit event per change. Its route table must match the OpenAPI document, so a new
  route cannot skip it.
- **The API contract** — [`openapi-docs.e2e-spec.ts`](apps/api/src/common/openapi-docs.e2e-spec.ts)
  fails when [`docs/api/openapi.json`](docs/api/openapi.json) drifts from the code
  (`pnpm openapi` regenerates it).
- **Money and history rules** — `libs/domain` (100% coverage): exact FX conversion, band
  metrics, salary-change planning, leave and termination rules.

## How it is built

| Part         | Choice                                          | Why (details in the ADR)                                                                                                                           |
| ------------ | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Monorepo     | Nx 24, pnpm                                     | one history, shared contracts, enforced boundaries ([ADR-001](docs/decisions/ADR-001-nx-monorepo.md))                                              |
| API          | NestJS 12 (ESM) + Drizzle + PostgreSQL          | layered, testable, real SQL ([ADR-002](docs/decisions/ADR-002-nestjs-drizzle-postgres.md), [ADR-011](docs/decisions/ADR-011-api-esm-tsc-build.md)) |
| Web          | React 19 + Vite + Tailwind + shadcn/ui          | ([ADR-003](docs/decisions/ADR-003-frontend-react-default.md))                                                                                      |
| Money        | integer minor units + ISO currency, dated FX    | ([ADR-004](docs/decisions/ADR-004-money-and-currency.md))                                                                                          |
| Hosting      | Vercel (web + API) and Neon Postgres, Singapore | ([ADR-008](docs/decisions/ADR-008-deploy-vercel-neon.md))                                                                                          |
| Supply chain | audit, gitleaks, OSV in CI; SHA-pinned actions  | ([ADR-012](docs/decisions/ADR-012-dependency-vulnerability-policy.md))                                                                             |

## Where to read more

- [`docs/requirements.md`](docs/requirements.md) — the one-page requirements, written before any code
- [`docs/vault/`](docs/vault/index.md) — product, design and plan (start at `index.md`)
- [`docs/decisions/`](docs/decisions/) — architecture decision records
- [`docs/ai/prompts.md`](docs/ai/prompts.md) — how AI tools were used, including what was rejected

## Licence

[MIT](LICENSE)
