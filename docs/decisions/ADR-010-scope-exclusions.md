# ADR-010 — Deliberately exclude merit cycles, payroll, benchmarking, approvals, integrations, micro-frontends and the Chrome extension from v1

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
Five days, one engineer plus an agent, a brief that says "we are not looking for the most
complex system, but for good engineering judgment", and an explicit request to document what
is left out and why. Market tools (ADR context: Pave, Ravio, Lattice…) bundle many workflows;
copying their surface area would produce a thin, untested clone.

## Exclusions and reasoning
| Excluded | Why |
|---|---|
| Merit / bonus / promotion cycles | A workflow product on its own (budgets, worksheets, approvals, letters). The system of record and analytics must exist first; v2. |
| Payroll processing, payslips, tax | Different regulatory domain; PayLens informs payroll, it does not run it. |
| Benefits, equity, bonuses (total rewards) | Needs its own data model and valuation rules; base salary proves the architecture. |
| External market benchmarking | Requires a licensed or crowd-sourced dataset we do not have; bands are seeded instead. |
| Approval workflows | One persona; approvals add states without proving more engineering. Audit trail covers accountability. |
| HRIS / payroll integrations | API-first with OpenAPI leaves the door open; integrations are maintenance-heavy. |
| Employee self-service | Different audience and auth surface; would double the UI scope. |
| Micro-frontends | Solve an organisational problem (independent team deploys) that one HR tool does not have; add deploy complexity and failure modes to a demo. A modular monolith with feature libraries keeps the option. |
| Chrome extension | Named in the JD, but no user job in this brief needs one; stated honestly in the coverage matrix. |
| Live FX feeds, UI i18n, dark mode (v1) | Nice-to-have; the dated FX table proves the model; tokens make dark mode cheap later. |

## Decision
Ship the system of record, bands, multi-currency analytics, import/export, roles, audit and
a tool-grounded assistant; list the above as v2 with reasoning in README and requirements.

## Consequences
- Positive: depth over breadth; every shipped feature is tested and explainable.
- Negative: the product is not a full compensation suite; the README must frame it as the on-ramp.
- Follow-ups: backlog.md holds the v2 roadmap; promote items only with a new ADR.

## Links
docs/vault/product.md · docs/vault/product/backlog.md · docs/requirements.md
