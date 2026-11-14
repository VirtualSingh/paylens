---
title: Features (MoSCoW) — the single source of scope
updated: 2026-11-14
status: active
---

# Features — MoSCoW

IDs are stable; reference them in commits (`feat(F-07): ...`), tests and progress notes.
**Must** = the assessment is incomplete without it. **Should** = planned for v1, cut only
under deadline pressure. **Could** = stretch after Phase 5 is green. **Won't (v1)** = explicitly
out, with reasoning in [../product.md](../product.md) and ADR-010.

## A. Identity, access, governance

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-01 | Sign in with Google (ID token verified server-side), server-side sessions, logout | Must | No passwords stored. Consent screen published for basic scopes. |
| F-02 | Demo login ("Continue as demo HR manager") behind `DEMO_MODE=true` | Must | Reviewers must not need a Google account. Demo users are flagged and rate-limited. |
| F-03 | Roles: `admin`, `hr_manager`, `viewer`; deny-by-default guards; field masking for viewers | Must | Viewer sees directory without salary figures and aggregates only. Matrix test. |
| F-04 | Immutable audit log: who/what/when/why, before/after diff, request id | Must | Append-only table; DB role has no UPDATE/DELETE on it. UI: filterable timeline. |
| F-05 | User & role management (admin) | Should | Small table UI; invite = add email + role. |

## B. People and salary records

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-06 | Employee directory: search (name/code/email), filters (country, department, level, status, band position), sort, server-side pagination | Must | p95 < 300 ms at 10k. Column chooser, density toggle, URL-synced state. |
| F-07 | Employee profile: details, manager, current pay (local + reporting currency), band bar, compa-ratio, range penetration | Must | The band bar is the signature UI element. |
| F-08 | Salary history timeline (effective-dated, with reason, note, actor) + chart | Must | Read model for trend analytics. |
| F-09 | Record a salary change: effective date, amount, reason, note; preview delta %, new compa-ratio, band warnings; optimistic concurrency | Must | Transaction: close current record, insert new, write audit. Future-dated allowed. |
| F-10 | Create employee; edit employment details (department, level, title, manager, status) | Must | Country/currency fixed after creation (transfer = v2). |
| F-11 | Terminate / reactivate employee (status change with effective date) | Should | No hard deletes anywhere. |
| F-12 | Saved views (named filter sets) per user | Could | Nice UX; low risk. |

## C. Pay structure and currency

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-13 | Pay bands per job level × country (min/mid/max, effective-dated) | Must | Seeded; admin CRUD. |
| F-14 | Band metrics: compa-ratio, range penetration, position (below/within/above) | Must | Formulas in [../design/analytics.md](../design/analytics.md). |
| F-15 | Multi-currency: money stored in minor units with ISO code; dated FX table; reporting-currency switch (USD default) | Must | Conversion as-of a date; rounding documented; UI always labels the currency. |
| F-16 | FX rate management (admin): view table, add rate as-of date | Should | Static sample rates in seed, clearly labelled "not live". |

## D. Analytics — "how do we pay people?"

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-17 | Summary: headcount, annual payroll (reporting currency), median, p25/p75/p90, % within band | Must | Dashboard KPI row. |
| F-18 | Breakdowns by country / department / level / job family: headcount, payroll, median, compa-ratio | Must | Sortable table + chart. |
| F-19 | Band positioning: beeswarm/strip of everyone's position in band, by level; outlier list (hr roles) | Must | Dashboard hero. |
| F-20 | Distribution: percentiles and histogram per group | Must | `percentile_cont` in SQL. |
| F-21 | Trend: payroll and headcount over time from effective-dated history | Should | Monthly buckets; FX as-of bucket end. |
| F-22 | Pay gap by category (gender default; by level/country), mean & median, with a "what this does / does not show" note | Should | Mirrors EU directive reporting (mean/median gap). Pending decision on gender in model. |
| F-23 | Export any analytics table as CSV | Should | CSV-injection safe. |

## E. Data in and out

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-24 | CSV import wizard: upload → map columns → validate (row-level errors) → preview → commit; downloadable error report | Should | The "migrate off Excel" story. Dry-run by default. Transactional commit. |
| F-25 | Export employees/salaries as CSV (role-gated, masked for viewers) | Should | |
| F-26 | Deterministic seed of 10,000 employees with realistic distributions and history | Must | Assessment requirement. [../design/seed.md](../design/seed.md). |

## F. Assistant

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-27 | "Ask about pay": Mastra agent with read-only analytics tools; role-aware; shows tools used; refuses off-topic | Should | Provider-neutral via env. Built last (Phase 4). |
| F-28 | Evals: ≥ 15 question→expected-tool cases as deterministic tests; live eval script + committed report | Should | Responsible-AI evidence for the JD. |
| F-29 | Rate limit + daily cost cap + `ai_queries` audit | Should | Part of F-27 acceptance. |
| F-30 | Expose the analytics tools as an MCP server (Mastra `MCPServer`) | Could | "Extending agents with tools" — flashy, small if F-27 exists. |

## G. Platform and quality (always on)

| ID | Feature | Priority | Notes |
|---|---|---|---|
| F-31 | OpenAPI docs at `/api/docs`, problem+json errors, request ids, health endpoints | Must | |
| F-32 | CI: lint, typecheck, unit/integration tests, build, `pnpm audit`, secret scan on every push | Must | GitHub Actions; pinned action SHAs. |
| F-33 | Deployed: Vercel (web + api) + Neon Postgres; preview deployments on PRs | Must | [../design/deployment.md](../design/deployment.md). |
| F-34 | Accessibility: WCAG 2.2 AA on key screens, keyboard-first, reduced motion | Must | axe in component tests + Playwright. |
| F-35 | Command palette (⌘K) for navigation and employee search | Should | |
| F-36 | Dark mode | Could | Tokens are ready for it. |
| F-37 | Dockerfile (Cloud-Run-ready) + docker-compose for local Postgres | Should | JD nice-to-have (Docker). |

## Won't (v1)

Merit/bonus cycles · payroll processing · benefits/equity · market benchmarking · approval
workflows · HRIS integrations · employee self-service · micro-frontends · Chrome extension ·
live FX feeds · UI i18n. Reasoning: [../product.md](../product.md) and `../../decisions/ADR-010-scope-exclusions.md`.
