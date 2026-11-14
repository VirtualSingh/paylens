---
title: Backlog — ideas parked, never silently built
updated: 2026-11-14
status: active
---

# Backlog (parked ideas)

Rule: if an idea is not in [features.md](features.md) for the current phase, it goes here
with one line of reasoning. Pushpendra promotes items; the agent does not.

## v1 stretch (only after Phase 5 is green and deployed)

- F-12 Saved views per user.
- F-30 MCP server exposing the analytics tools (Mastra `MCPServer`) so Claude Desktop /
  Claude Code can query the demo org's pay data. Great JD story, ~2 hours if F-27 exists.
- F-36 Dark mode (tokens already support it).
- Mutation testing (Stryker) on `libs/domain` — craftsmanship flex, cheap on a pure lib.
- k6 or autocannon load script with a committed p95 report at 10k rows.
- Keyset pagination for the directory (offset is fine at 10k; keyset proves "designed for 100k").
- Cloud Run deployment of the API container as an alternative to Vercel (Dockerfile exists).

## v2 (product roadmap, mention in README "What's next")

- Merit / promotion cycle planning: budgets, manager worksheets, approvals, letters.
- Approval workflow for salary changes (proposed → approved → effective).
- Adjusted (regression-based) pay gap controlling for level, tenure, location.
- Total rewards: bonus targets, allowances, equity; total-comp statements.
- Market benchmarking via a licensed dataset or anonymised peer pool.
- Country transfers (currency change mid-history) and FTE proration.
- HRIS/payroll integrations (webhooks, scheduled sync), SCIM user provisioning, SSO beyond Google.
- Employee self-service view ("my pay, my band, my history").
- Scheduled reports (email a monthly pay summary), alerting on band breaches.
- Localised UI (i18n) and accessibility audit by a third party.

## Explicitly rejected (do not resurrect without a new ADR)

- Micro-frontends — see ADR-010.
- Storing money as floats or as a single global currency — see ADR-004.
- JWT-in-localStorage auth — see ADR-006.
- Letting the assistant run SQL or see raw rows — see ADR-009.
