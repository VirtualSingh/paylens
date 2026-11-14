---
title: Plan — 5 days to a deployed, tested, documented PayLens
updated: 2026-11-14
status: active
---

# Plan

Deadline: submit **2026-11-19**. Today: 2026-11-14 (evening). Agent: Claude Code (Opus,
highest effort) in auto mode; Pushpendra reviews at each checkpoint. Phases are ordered so
that a reviewer who stops reading the history at any day still sees a coherent, tested,
deployed product.

## Phases

| Phase | File | Window | Outcome (exit criterion) |
|---|---|---|---|
| 0 Foundation | [plan/phase-0-foundation.md](plan/phase-0-foundation.md) | Nov 14 night → Nov 15 noon | Repo, vault, requirements doc, Nx workspace, CI green, **walking skeleton deployed** to Vercel + Neon |
| 1 Domain + data | [plan/phase-1-domain-data.md](plan/phase-1-domain-data.md) | Nov 15 → Nov 16 | Domain lib 100% tested, schema + migrations, 10k seed, employees/salary API with TDD |
| 2 Auth + UI core | [plan/phase-2-auth-ui-core.md](plan/phase-2-auth-ui-core.md) | Nov 16 → Nov 17 | Google + demo login, roles, audit log, directory, profile, change-salary sheet |
| 3 Analytics + import | [plan/phase-3-analytics-import.md](plan/phase-3-analytics-import.md) | Nov 17 → Nov 18 | Dashboard with all canonical questions, bands, FX switch, CSV import/export |
| 4 AI + hardening | [plan/phase-4-ai-hardening.md](plan/phase-4-ai-hardening.md) | Nov 18 | "Ask about pay" with evals; security, performance, a11y passes with recorded results |
| 5 Ship | [plan/phase-5-ship.md](plan/phase-5-ship.md) | Nov 19 | Production deploy verified, README, ADRs, AI log, video, submission |

Buffer: each phase keeps ~20% slack; if a phase overruns by more than half a day, cut from
the **Should** list in [product/features.md](product/features.md) in this order:
F-12 → F-30 → F-36 → F-21 (trend) → F-22 (pay gap) → F-24 (import; keep export) → F-27/28
(assistant → documented stub). Never cut tests, audit, roles, or deployment.

## Daily cadence

1. Morning (Pushpendra, 10 min): read `progress.md`, answer "Decisions pending", say go.
2. Agent works the phase file top-down; one task = one or more TDD cycles = commits.
3. Checkpoint (Pushpendra, 20 min): pull, run `pnpm test`, click through the new UI, leave
   notes in `progress.md` under "Review notes"; agent addresses them first next session.
4. Night: agent updates `progress.md`, log file, prompts log; CI green; stop.

## Definition of done (every task; copied from CLAUDE.md)

Tests first and passing · lint/typecheck clean · vault updated · ADR if a decision was made ·
committed (conventional) · CI green · `progress.md` names the next step.

## Risk register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Recruiter says React only / allows Angular late | medium | high if late | UI work starts Phase 2; everything before is framework-independent; default React |
| Vercel zero-config NestJS misbehaves (ESM, bundle size) | medium | medium | Deploy the skeleton in Phase 0; fallback: `api/index.ts` adapter or Docker on Cloud Run |
| Neon cold start on first demo request | high | low | Mention in README; optional cron ping; warm before video |
| PGlite lacks an extension we use | low | medium | Exclusion constraints need `btree_gist` — verify in Phase 1 task 1.2 first; fallback: pg in Docker for tests |
| Seed too slow against Neon | medium | low | Batched inserts; seed from a machine near the region; `--size` flag |
| Google OAuth consent/verification friction | medium | medium | Publish consent screen early (Phase 2); demo login is the reviewer path |
| Assistant costs or provider limits | low | low | Daily caps; mock model in tests; stub fallback |
| Time: React learning curve for the human reviewer (Pushpendra) | high | medium | Conventional React only; `docs/learning/react-for-angular-engineers.md`; ask the agent to explain any file |
| Scope creep from "amazing UI" | high | high | Design is fixed in ui.md; new ideas go to backlog; polish pass is Phase 4/5 only |
| Commit history looks machine-generated (huge commits) | medium | high | TDD cadence rules in CLAUDE.md; pre-commit hook; Pushpendra reviews `git log` daily |

## Checkpoint questions Pushpendra should ask at each review

- Can I explain this file in an interview? If not, ask the agent to simplify or document it.
- Does `git log --oneline -30` read like a story of tests then features then refactors?
- Did anything get built that is not in features.md? Move it to backlog or justify it.
- Are the numbers right? Pick one employee, compute compa-ratio by hand, compare.
