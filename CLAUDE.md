# PayLens — project instructions for Claude Code

PayLens is an employee salary management web app for ACME (10,000 employees, multiple
countries). Persona: the HR manager. Two jobs: manage salary data safely, and answer
"how does the org pay people?" with trust. Built as a take-home assessment for Incubyte
(craftsmanship shop: TDD, small commits, clean code) and as a portfolio product.

Owner: Pushpendra Singh (singh16195@gmail.com). Submission deadline: 2026-11-19.

## Start-of-session ritual (always, in this order)

1. Read `docs/vault/progress.md` — current state, next 3 steps, open decisions.
2. Read the current phase file linked from `docs/vault/plan.md`.
3. Read only the design files the current task touches (`docs/vault/design.md` is the map).
4. Say in one line what you are about to do, then start with a failing test.

## End-of-session ritual (always)

1. Update `docs/vault/progress.md` (current state, next 3 steps, blockers, decisions pending).
2. Append a dated entry to the current `docs/vault/progress/log-YYYY-MM-DD.md`.
3. Append any new prompt/decision worth keeping to `docs/ai/prompts.md` (2–5 lines).
4. Commit. Working tree must be clean and CI-green before you stop.

## The vault (second brain) — rules

- The vault lives in `docs/vault/`. Entry points: `product.md`, `design.md`, `plan.md`,
  `progress.md`; `index.md` is the map. Decisions live in `docs/decisions/ADR-*.md`.
- Every vault file stays small: **≤ 200 lines or ≤ 12 KB**. When a file would exceed
  that, create `<name>-2.md` (or a topic split), end the old file with a line
  "Continues in →" linking to the new file, start the new one with a line
  "← Continued from" linking back, and add the new file to `index.md`
  (see `design/ui.md` → `design/ui-screens.md` for the pattern).
- `progress.md` is a rolling window: Current state (≤ 15 lines), Now / Next / Later,
  Blockers, Decisions pending. Detail goes to `progress/log-YYYY-MM-DD.md`.
- Never delete history from the vault; supersede it (strike through or "superseded by").
- When you make a decision that is not already in an ADR, write one (≤ 40 lines, template
  in `docs/decisions/ADR-000-template.md`) in the same commit as the code.

## Non-negotiables

**TDD cadence and commits.** Red → green → refactor, in that order, for every behaviour.
Commit at the end of each cycle (or at most every ~30 minutes of work). Conventional
commits: `test:`, `feat:`, `fix:`, `refactor:`, `docs:`, `chore:`, `ci:`, `perf:`,
`security:`. A `feat:` commit may include its tests; a `refactor:` commit changes no
behaviour and all tests stay green. No giant "initial commit" dumps, no history rewrites,
no `--no-verify`, no skipped tests left behind. Every commit must build and pass tests.

**Security.** Follow `docs/vault/design/security.md`. Never commit secrets (use
`.env.example`). Never log salaries, names or emails. Deny by default in authorization.
All input validated at the boundary with the shared Zod schemas. Parameterised queries
only; sort/filter fields come from allowlists. No stack traces to clients.

**Money and dates.** Money is integer minor units (`bigint`) + ISO-4217 code — never
floats. Conversions use dated FX rates and documented rounding. Dates are ISO strings;
effective dating is UTC `date`, timestamps are `timestamptz`.

**History is immutable.** Salary history and audit events are append-only. A correction
is a new record with reason `correction`, never an UPDATE of the past.

**Scope discipline.** Build what `docs/vault/plan.md` says for the current phase. Ideas
go to `docs/vault/product/backlog.md`, not into the code.

## Coding standards

- TypeScript `strict`, no `any` (use `unknown` + narrowing), no non-null assertions in
  production code, `readonly` where it costs nothing.
- Backend: thin controllers → services (business rules) → repositories (SQL via Drizzle).
  Pure domain logic lives in `libs/domain` with zero framework imports.
- Shared contracts (Zod schemas, DTO types, enums) live in `libs/shared`; both apps import
  them. Never duplicate a schema.
- Errors: domain errors → HTTP via one exception filter, `application/problem+json`.
- Frontend: server state in TanStack Query, forms with react-hook-form + shared Zod schemas,
  components small and composable, no clever abstractions, accessibility is not optional.
- Naming: plain English, same word for the same thing everywhere (see `docs/vault/glossary.md`).
- Comments explain *why*; the code explains *what*.

## Testing standards

- Vitest everywhere. Files `*.spec.ts(x)`. Arrange–Act–Assert. One behaviour per test.
- Fast (< 60 s for the whole suite locally), deterministic (seeded randomness, fixed clocks,
  no network, no sleeps), independent (no order dependence).
- Pyramid: pure domain tests (most) → service tests with in-memory fakes → repository and
  SQL tests against PGlite (embedded Postgres, migrations applied) → a handful of API tests
  with supertest → component tests with Testing Library → 2–3 Playwright journeys.
- Authorization gets an explicit matrix test (every role × every mutating endpoint).
- No snapshot tests of UI markup. No tests that assert on implementation details.

## Working with Pushpendra (the human)

- He is usually available. Ask when: a decision costs money, cannot be undone, changes the
  stack or scope, or two defensible options differ in what the reviewer will see.
  Ask one question at a time and propose a default.
- Otherwise decide, record the reasoning in `progress.md` (Decisions taken), and continue.
- Machine and account setup is your job, not his: user-level tooling (pnpm via corepack,
  Node via fnm/nvm, the `vercel`/`neonctl`/`gh` CLIs, MCP servers via `claude mcp add`,
  `gh` repo creation, Vercel/Neon projects via CLI or MCP) — just do it, then verify it works.
  Ask only when his hands are required: admin-level installs, browser logins (OAuth),
  account sign-ups, a Claude Code restart after adding MCP servers, and anything that costs money.
- Never: push with force, delete data, publish anything, create paid resources, change
  the frontend framework, or disable a security control.
- Prefer explaining over cleverness: he will defend every line of this code in an interview.

## Commands (pnpm + Nx)

```
pnpm install            pnpm nx run-many -t lint test build
pnpm nx test api        pnpm nx test web        pnpm nx test domain
pnpm nx serve api       pnpm nx serve web       pnpm db:migrate   pnpm db:seed
pnpm nx e2e web-e2e     pnpm audit --prod       pnpm format
```

## Definition of done (every task)

Tests written first and passing · lint/typecheck clean · docs/vault updated · ADR if a
decision was made · commit(s) pushed · CI green · `progress.md` says what is next.
