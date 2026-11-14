---
title: Phase 4 — "Ask about pay" assistant, security pass, performance pass, accessibility pass
updated: 2026-11-14
status: active
window: 2026-11-18
---

# Phase 4 — AI + hardening

**Goal:** add the tool-grounded assistant with evals, then run three explicit passes
(security, performance, accessibility) and record their results as artefacts.
**Entry:** Phase 3 exit checklist green. If Phase 3 overran by > half a day, do 4.2–4.4 first
and ship the assistant as a stub (see cut order in [../plan.md](../plan.md)).

## Tasks

### 4.1 Assistant (≈ 4 h) — per [../design/ai-assistant.md](../design/ai-assistant.md)
- `assistant` module: Mastra `Agent` with instructions file; tools as thin adapters over
  `AnalyticsService` (actor passed through), Zod-typed, size-capped outputs with `truncated`.
- Model router from `AI_MODEL`; `AI_ENABLED=false` → endpoint returns 503 problem with a
  friendly message and the UI hides the panel.
- `POST /ask` (streaming) and `POST /ask/:id/feedback`; `ai_queries` logging; throttling and
  daily caps (per-user and global tokens); output filter.
- **Deterministic evals in CI**: `evals/cases.ts` (≥ 15) with the mock model; tests for role
  gating (viewer never triggers `listOutliers`), refusal of off-topic, injection attempt,
  truncation notice, cap exceeded.
- Live eval script `api:evals:live` with Mastra scorers → `docs/ai/eval-report.md` (run once
  with the chosen provider; commit the report).
- UI `AskPanel` on the dashboard and `/ask`: streaming answer, "How this was computed",
  suggested questions, feedback, aggregate-only note for viewers. Tests with MSW stream mock.
Commits: `test(assistant): viewer questions never call hr-only tools` → `feat(assistant): mastra agent with read-only analytics tools` → `feat(assistant): ask panel` → `docs(ai): live eval report`.

### 4.2 Security pass (≈ 2 h) — run the checklist in [../design/security.md](../design/security.md)
- Verify headers/CSP on prod with the browser and securityheaders.com; fix findings.
- Probe: sort/filter injection, CSV formula, oversize upload, forged token, viewer escalation,
  assistant injection. Each probe becomes a test if not already covered.
- `pnpm audit`, `osv-scanner`, `gitleaks` clean; Dependabot config committed.
- Write `docs/security-check.md` with the ticked checklist, dates, and residual risks.

### 4.3 Performance pass (≈ 1.5 h)
- Re-run `tools/perf` against prod (warm and cold); directory p95 < 300 ms warm, analytics < 500 ms.
- Bundle analysis (`vite-bundle-visualizer`): initial ≤ 250 KB gz; ECharts split into analytics routes.
- Lighthouse on dashboard and directory ≥ 90 performance / 100 accessibility; fix the cheap wins.
- Update `docs/perf.md` with before/after and the index/caching decisions (ties to JD "performance optimisation").

### 4.4 Accessibility pass (≈ 1 h)
- Playwright + axe on the three journeys; keyboard-only run of change-salary and import.
- Check focus order in sheets/dialogs, `aria-sort`, chart table alternatives, reduced motion.
- Record results in `docs/a11y.md` (short).

### 4.5 Polish within the design (≈ 1.5 h, time-boxed)
- Empty states, error copy, skeletons, toasts consistent with ui.md voice. Screenshot each
  main screen for the README (`docs/screenshots/*.png`, light theme, seeded data).
- No new features. Anything tempting goes to `product/backlog.md`.

## Exit checklist

- [ ] Assistant answers the seven canonical questions on prod; eval report committed with pass rate
- [ ] `docs/security-check.md`, `docs/perf.md`, `docs/a11y.md` committed with real numbers
- [ ] Lighthouse ≥ 90/100 on dashboard; CI security jobs green
- [ ] ADR-009 (assistant) written; `progress.md` lists exactly what Phase 5 must still do

## Notes for the agent

- Never call a real model in tests. If a test needs a model, it uses the mock.
- Treat every probe finding as a failing test first; fix second.
- Screenshots are artefacts: consistent window size (1440×900), same employee, no personal data.
