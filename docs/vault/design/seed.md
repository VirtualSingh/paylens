---
title: Seed — deterministic 10,000-employee dataset
updated: 2026-11-15
status: active
---

# Seed (F-26)

`pnpm db:seed` builds a realistic, deterministic ACME. Realistic means the dashboard tells a
story (bands, outliers, a visible trend); deterministic means the same seed produces the
same database every time (`faker.seed(42)`, no `Date.now()` except a fixed `SEED_AS_OF`
= 2026-11-01).

## Reference data

| Set | Values |
|---|---|
| Countries (share of headcount) | IN 30% (INR) · US 25% (USD) · GB 12% (GBP) · DE 10% (EUR) · CA 7% (CAD) · SG 6% (SGD) · AU 6% (AUD) · BR 4% (BRL) |
| Departments (10) | Engineering 34%, Sales 14%, Customer Success 10%, Operations 9%, Product 8%, Marketing 7%, Finance 6%, People 5%, Design 4%, Legal 3% |
| Job families (6) | Software, Data, Product & Design, Go-to-market, Business Operations, Corporate |
| Levels (10) | IC1–IC6 (ranks 1–6), M1–M4 (ranks 4–7 equivalent); distribution pyramid: IC2–IC4 dense, IC6/M4 rare (≈1%) |
| Employment type | full_time 90%, part_time 6% (fte 0.5–0.8), contractor 4% |
| Status | active 92%, on_leave 3%, terminated 5% (termination_date set; still in history and audit) |
| Gender (D-2) | female 48%, male 52% — no engineered gap; natural noise only |
| Hire dates | 2014-01-01 … 2026-10-31, weighted toward recent years (growth) |
| Managers | M-track employees in the same department and country; ICs get a manager one level up; ~8 reports per manager |

## Pay bands

For each level × country: `mid = base_mid_usd[level] × country_index[country] / usd_rate[country]`,
rounded to a sensible local figure; `min = mid × 0.80`, `max = mid × 1.20`. Base USD mids:
IC1 55k · IC2 72k · IC3 95k · IC4 125k · IC5 160k · IC6 205k · M1 140k · M2 175k · M3 215k · M4 265k.
Country index (labour-cost proxy, illustrative): US 1.00 · GB 0.78 · DE 0.80 · CA 0.82 · AU 0.85 ·
SG 0.80 · IN 0.26 · BR 0.32. Bands are effective from 2024-01-01; a second generation
effective 2026-01-01 at +4% exists for US/GB/DE so "band history" has content.

## FX rates (static, labelled "sample rates, not live")

`fx_rates` as of **2025-11-01** and **2026-11-01** (so the trend shows FX effects). Use
approximate plausible USD-based rates (e.g. 1 USD ≈ 83 INR, 0.78 GBP, 0.92 EUR, 1.36 CAD,
1.34 SGD, 1.52 AUD, 5.3 BRL for 2026; vary ±2–4% for 2025). The seed file holds them in
`fx-rates.json` with a `source: "sample"` field; the UI tooltip shows the as-of date.

## Salaries and history

- Current annual salary (local): `mid × exp(N(0, 0.12))` clamped so that ~8% of people
  land below band and ~4% above (the dashboard needs outliers to be interesting; the exact
  share is asserted in the seed smoke test with tolerance).
- Pay frequency: annual for US/CA/AU/GB/SG, monthly for IN/DE/BR (amount stored monthly;
  annualised in queries) — exercises the frequency logic.
- History: `k = 0..5` prior records depending on tenure (≈ one change per year); each prior
  record is the next one divided by a raise of 3–12% (merit) with occasional promotions
  (level bump recorded in `note`) and one `correction` per ~300 employees. `effective_from`
  values are April 1 of each year (ACME's cycle) plus the hire date; periods are contiguous
  (`effective_to = next.effective_from`), current record `effective_to = NULL`.
- Terminated employees have their last record closed at `termination_date`.

## Users

Demo users: `demo.hr@paylens.local` (hr_manager), `demo.viewer@paylens.local` (viewer),
`demo.admin@paylens.local` (admin) — flagged `is_demo`. Pushpendra's Google email as `admin`.
Audit events: the seed writes one `employee.imported` event per employee attributed to a
`system` user so the audit log is populated and the "who changed what" story works from day one.

## Performance and safety

- Generate in memory, insert with multi-row `INSERT` in batches of 1,000 inside one
  transaction per table; target < 30 s locally, < 90 s against Neon (network-bound).
- Idempotent guard: refuses if `employees` is non-empty unless `SEED_FORCE=yes`
  (then truncates business tables, never `users` with `is_demo=false`).
- `pnpm db:seed --size 500` for e2e tests and previews; the generator is a pure function
  `generateAcme({ size, seed, asOf })` so unit tests assert distributions on 2,000 rows
  (country shares ±2%, band outlier share 10–14%, no overlapping periods, all currencies
  match country, every manager is in the same country, all codes unique).

## Where the code lives

`apps/api/src/db/seed/` — `generate.ts` (pure), `reference-data.ts`, `fx-rates.json`,
`insert.ts` (batched writer), `cli.ts` (`db:seed` entry with flags), `generate.spec.ts`.
