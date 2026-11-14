---
title: PayLens vault — map of content
updated: 2026-11-14
---

# PayLens vault — map of content

This folder is the project's second brain. Small files, heavily linked. Rules for using
and growing it are in the repo root `CLAUDE.md` ("The vault").

## Entry points (read these first)

| File | What it answers | Read when |
|---|---|---|
| [progress.md](progress.md) | Where are we, what's next, what's blocked | Every session start |
| [plan.md](plan.md) | The 5-day execution plan, phase by phase | Picking the next task |
| [product.md](product.md) | What we are building, for whom, and what we are not | Scoping a feature |
| [design.md](design.md) | How it is built: architecture, data, API, UI, security, tests | Implementing anything |

## Product

- [product/features.md](product/features.md) — MoSCoW feature list with IDs (F-xx), the single source of scope
- [product/coverage-matrix.md](product/coverage-matrix.md) — every assessment and JD bullet → where it is satisfied
- [product/market-research.md](product/market-research.md) — what Pave, Ravio, Lattice, Figures and others do; feature taxonomy
- [product/pain-points.md](product/pain-points.md) — what users complain about → the feature that answers it
- [product/backlog.md](product/backlog.md) — ideas parked for later (never silently built)

## Design

- [design/architecture.md](design/architecture.md) — monorepo layout, runtime topology, module boundaries
- [design/data-model.md](design/data-model.md) — tables, constraints, indexes, money/FX rules
- [design/api.md](design/api.md) — REST surface, conventions, error format, pagination
- [design/frontend.md](design/frontend.md) — implementation stack for the web app (React default / Angular variant)
- [design/ui.md](design/ui.md) — design tokens, screens, components, copy voice, accessibility
- [design/analytics.md](design/analytics.md) — the metrics, their formulas, and the SQL approach
- [design/ai-assistant.md](design/ai-assistant.md) — "Ask about pay" agent: tools, guardrails, evals
- [design/security.md](design/security.md) — threat model and controls mapped to OWASP Top 10:2025
- [design/testing.md](design/testing.md) — test pyramid, harnesses, TDD cadence, coverage targets
- [design/deployment.md](design/deployment.md) — Vercel + Neon topology, env vars, CI/CD, Docker
- [design/seed.md](design/seed.md) — deterministic 10,000-employee seed: distributions and rules

## Plan

- [plan/phase-0-foundation.md](plan/phase-0-foundation.md) · [plan/phase-1-domain-data.md](plan/phase-1-domain-data.md) · [plan/phase-2-auth-ui-core.md](plan/phase-2-auth-ui-core.md)
- [plan/phase-3-analytics-import.md](plan/phase-3-analytics-import.md) · [plan/phase-4-ai-hardening.md](plan/phase-4-ai-hardening.md) · [plan/phase-5-ship.md](plan/phase-5-ship.md)

## Progress

- [progress.md](progress.md) — rolling window
- [progress/log-2026-11-14.md](progress/log-2026-11-14.md) — planning session; build 0.0–0.2
- [progress/log-2026-11-15.md](progress/log-2026-11-15.md) — build session from 0.3

## Reference

- [glossary.md](glossary.md) — compensation vocabulary used in code and UI
- `../decisions/` — ADRs (architecture decision records)
- `../requirements.md` — the one-page requirements document required by the assessment
- `../ai/prompts.md` — log of prompts and AI usage (an assessment artifact)
- `../ai/kickoff-prompt.md` — the first message to give Claude Code
- `../demo-script.md` — video demo script
- `../learning/react-for-angular-engineers.md` — for Pushpendra, not for the agent

## Conventions

- Links are relative markdown links so both Obsidian and Claude Code resolve them.
- Each file has a frontmatter `updated:` date; bump it when you change the file.
- Status words: `draft` → `active` → `superseded by X`. Nothing is deleted.
