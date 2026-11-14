---
title: Coverage matrix — assessment brief and JD → where each box is ticked
updated: 2026-11-14
status: active
---

# Coverage matrix

Check this before submission. Every row must point at something real (a feature ID, a
file, a test, a commit range). "Evidence" is what the reviewer will actually see.

## A. Assessment brief

| Brief says | Satisfied by | Evidence |
|---|---|---|
| Write a one-page requirements doc first (goal, scope, exclusions + reasoning) | `docs/requirements.md` | First commits in history, before any code |
| Backend in the role's language or any framework of choice; relational DB | NestJS 12 (TypeScript) + Postgres (Neon) via Drizzle | `apps/api`, ADR-002 |
| UI: ReactJS or NextJS (Angular only for Java roles) | React 19 + Vite (default) — Angular only if recruiter confirms | `apps/web`, ADR-003 |
| Component library of your choice | shadcn/ui + Tailwind (React) / PrimeNG (Angular variant) | ADR-003, [../design/frontend.md](../design/frontend.md) |
| Seed script with 10,000 employees | F-26 deterministic seed | `pnpm db:seed`, seed smoke tests, [../design/seed.md](../design/seed.md) |
| Fully functional deployed software | F-33 Vercel + Neon | Live URL in README; demo login F-02 |
| Video demo | `docs/demo-script.md` | Link in README |
| Meaningful unit tests covering core functionality | Domain, service, repository, API, UI tests | `pnpm nx run-many -t test`; coverage report in CI |
| Tests fast, deterministic, easy to understand | Vitest, PGlite, fixed clocks, seeded data | [../design/testing.md](../design/testing.md) |
| Good structure, readability, maintainability | Nx monorepo, layered API, shared Zod contracts, ADRs | [../design/architecture.md](../design/architecture.md) |
| Incremental commits showing evolution | TDD cadence, conventional commits, one behaviour per cycle | `git log --oneline` |
| Artifacts: requirements, planning/design notes, diagrams, prompts, trade-offs, performance | This vault, ADRs, Mermaid diagrams, `docs/ai/prompts.md`, perf notes | `docs/` |
| Product thinking | Personas, jobs, pain-point→feature mapping, EU directive framing, deliberate exclusions | [../product.md](../product.md), [pain-points.md](pain-points.md) |
| HR manager can manage salary data | F-06…F-11, F-24, F-25 | Directory, profile, salary change, import |
| …and answer questions about how the org pays people | F-17…F-23, F-27 | Dashboard + assistant |
| Multiple countries | F-15 multi-currency, country-scoped bands | Data model |
| Use AI tools intentionally, maintaining correctness and quality | CLAUDE.md, prompts log, "where I overrode the AI" note, TDD gates | `docs/ai/prompts.md`, README |

## B. Job description (Incubyte, Software Craftsperson — TypeScript / AI)

| JD says | Satisfied by | Evidence |
|---|---|---|
| Own features end to end, design → production | Whole repo: requirements → ADRs → code → deploy → demo | README "How this was built" |
| Scalable backend systems and APIs in TypeScript, craftsmanship principles | NestJS layered API, server-side paging, indexes, stateless functions, pooled DB | `apps/api`, [../design/api.md](../design/api.md) |
| AI applications and agentic workflows with OpenAI, Claude, Mastra | F-27 Mastra agent, provider-neutral (Claude default) | `apps/api/src/assistant` |
| Browser-based experiences, Chrome Extensions where needed | Web app yes; Chrome extension **out of scope** (stated honestly) | requirements.md exclusions |
| Spot risks early | Threat model, risk register in plan, ADR trade-offs | [../design/security.md](../design/security.md), [../plan.md](../plan.md) |
| Raise the bar on code quality, testing, DevEx | TDD, CI gates, lint/format hooks, Nx caching, 5-minute setup, docs vault | CI, README |
| Strong hands-on TypeScript | strict TS across apps and libs, shared Zod schemas | tsconfig, `libs/shared` |
| LLM apps, agents, agentic frameworks (Mastra); extending agents with skills and tools | Custom tools wrapping analytics; optional MCP server (F-30) | [../design/ai-assistant.md](../design/ai-assistant.md) |
| Responsible AI: evaluation, reliability, safety, privacy | F-28 evals, guardrails, aggregate-only data to the model, rate/cost caps, AI audit | ai-assistant.md, eval report |
| System design; TDD, CI/CD, refactoring, Agile/XP | ADRs + architecture doc; red-green-refactor commits; GitHub Actions → Vercel; phased plan | `docs/decisions`, git log |
| REST/gRPC APIs, relational databases, performance optimisation | REST + OpenAPI; Postgres constraints/indexes; EXPLAIN notes; perf budget | api.md, data-model.md, `docs/perf.md` (Phase 4) |
| Nice: Docker/Kubernetes/Terraform | Dockerfile + compose (F-37); K8s/Terraform not attempted | deployment.md |
| Nice: React or another modern frontend framework | React (default) | `apps/web` |
| Nice: Python, LangChain/LlamaIndex, vector DBs, eval tools | Not used; Mastra evals/scorers cover evaluation | — |

## C. Honest gaps (say these out loud in the README)

- Chrome extension, gRPC, Kubernetes/Terraform, Python: not demonstrated. Don't fake them.
- Benchmarking against market data: not possible without a licensed dataset; bands are seeded.
- "No vulnerabilities" is not a claim anyone can make; the claim is a documented threat model,
  controls mapped to OWASP Top 10:2025, automated scans in CI, and a verification checklist
  run before submission ([../design/security.md](../design/security.md)).
