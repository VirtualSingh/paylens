---
title: Phase 3 — Analytics dashboard, pay bands, FX switch, CSV import/export
updated: 2026-11-14
status: active
window: 2026-11-17 → 2026-11-18
---

# Phase 3 — Analytics + import

**Goal:** the HR manager can answer the seven canonical questions from the dashboard, manage
bands and FX, and migrate a spreadsheet through the import wizard.
**Entry:** Phase 2 exit checklist green.

## Tasks

### 3.1 Analytics read models (≈ 3 h) — SQL on PGlite, test-first with the mini fixture
- `summary`, `breakdown(by)`, `distribution(groupBy)`, `bandPositioning`, `outliers`,
  `trend`, `payGap` per [../design/analytics.md](../design/analytics.md), each as a named
  query in `analytics/queries/*.sql.ts` with a spec holding hand-computed expected values.
- `AnalyticsService` applies role rules (viewer → counts not points; outliers hr+), the
  reporting currency, `asOf`, `unconvertedCount`, pay-gap suppression (n < 5).
- 60 s memo cache with invalidation on `comp.changed` events from salary/band/fx services.
- Controller + OpenAPI; `GET /analytics/export.csv` with formula-injection escaping (test).
Commits: `test(analytics): median by level matches hand-computed fixture` → `feat(analytics): breakdown and distribution queries` … one cycle per metric.

### 3.2 Pay bands and FX management (≈ 1.5 h)
- Admin `POST/PATCH /pay-bands` (effective-dated; exclusion constraint test), `POST /fx-rates`,
  `PATCH /settings` (reporting currency). Audit events for each.
- UI: Pay bands matrix page with below/above chips and band detail; FX table and settings page.

### 3.3 Dashboard (≈ 3.5 h)
- Hero: band positioning strip plot (ECharts scatter with jitter; one `s`-curve settle
  animation on load; reduced-motion off); viewer variant shows counts per level.
- KPI tiles (quiet), payroll by country stacked by department, median by level with band
  range marks, pay-gap dot plot with n labels and suppression notice, 24-month trend.
- Reporting-currency switch re-queries everything; "≈" and as-of tooltips via `MoneyText`.
- Every chart has a table toggle and CSV export; each metric has the ⓘ formula popover
  sourced from `explainMetric` text.
- Tests: KPI rendering from MSW data; currency switch triggers refetch with param; table
  toggle has accessible table; axe clean.

### 3.4 CSV import wizard and export (≈ 3 h)
- API: `POST /imports` (multipart, limits), header auto-mapping (fuzzy match to known fields),
  per-row validation with `csvRowSchema`, error report (first 500) and `errors.csv`,
  `PATCH mapping`, `POST commit` transactional (`?partial=true` option), audit event per
  import with counts. `GET /exports/employees.csv` role-gated and escaped.
- UI: stepper Upload → Map → Validate → Preview → Done; drag-and-drop; sample row preview;
  error table with download; imports history page.
- Tests: mapping detection on three header styles; row errors (bad currency for country,
  negative salary, duplicate code); dry-run leaves DB unchanged; commit inserts employees and
  initial salary records; 11 MB → 413; CSV injection escaped on export.
- Provide `docs/samples/acme-import-sample.csv` (200 rows) for reviewers and the video.

### 3.5 Performance first look (≈ 45 min)
- Run `tools/perf/directory-p95.ts` and analytics timings against the local 10k seed; capture
  `EXPLAIN (ANALYZE, BUFFERS)` for the directory, `employee_comp` join and breakdown; write
  `docs/perf.md` (first version). Fix any missing index now.

## Exit checklist

- [ ] All seven canonical questions answerable from the deployed dashboard, each < 1 s warm
- [ ] Pay-gap view suppresses small groups; viewer sees counts only in the strip plot
- [ ] Import of the sample CSV end-to-end on the deployed app; error report downloads
- [ ] `docs/perf.md` v1 with p95 numbers and query plans
- [ ] ADR-009 placeholder not needed yet; `progress.md` updated; cut list reviewed against time left

## Notes for the agent

- Analytics correctness beats chart polish: get the spec numbers right first, then the chart.
- Keep ECharts options in small typed builder functions with their own tests (data → option).
- Suppression and masking are security features: test them as such (role matrix extended).
