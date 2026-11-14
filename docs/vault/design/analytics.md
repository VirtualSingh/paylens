---
title: Analytics — metrics, formulas, canonical questions, SQL approach
updated: 2026-11-14
status: active
---

# Analytics

Every metric below has (a) a formula the UI can show, (b) a domain function or SQL
fragment, (c) at least one test with a hand-computed expected value on a tiny fixture.

## Canonical HR questions (the demo must answer each in < 1 s)

1. What is our total annual payroll, in USD, today?
2. What is the median salary for IC4 engineers in Germany?
3. Who is paid below their band, and by how much?
4. How does payroll split by country and department?
5. What is the gender pay gap (median) by level?
6. How has payroll changed over the last 24 months?
7. What share of people are within band, and where is the compression (p25 close to p75)?

## Definitions (also in [../glossary.md](../glossary.md))

| Metric | Formula | Notes |
|---|---|---|
| Annual salary | `amount_minor × factor(pay_frequency)` with annual=1, monthly=12 | Hourly out of scope |
| Reporting amount | `round_half_even(annual_local × rate(local→reporting, as_of))` | Rate = latest `fx_rates.as_of <= as_of`; unavailable → excluded from totals and counted in `unconvertedCount` |
| Annual payroll | `Σ reporting amount` over active employees as of date | Active = `status='active'` and hired ≤ as_of and (not terminated or terminated > as_of) |
| Headcount | count of active employees as of date | FTE-weighted variant optional |
| Median, p25, p75, p90 | `percentile_cont(0.5/0.25/0.75/0.9) WITHIN GROUP (ORDER BY reporting_amount)` | Continuous interpolation; stated in the UI |
| Compa-ratio | `annual_local / band_mid` | In local currency (band is local); 1.00 = at midpoint |
| Range penetration | `(annual_local − band_min) / (band_max − band_min)` | < 0 below, > 1 above |
| Band position | `below` if annual < min, `above` if > max, else `within` | Uses the band effective on `as_of` |
| Within-band % | within / (within + below + above) among employees with a band | Employees without a band reported separately |
| Pay gap (mean) | `(mean_reference − mean_group) / mean_reference` per category | Reference = male for gender (EU reporting convention); reported as % with n per side |
| Pay gap (median) | same with medians | Suppressed when either side n < 5 (privacy) |
| Compression index | `p75 / p25` within a level | < 1.15 flagged as compressed (heuristic, labelled) |
| Trend bucket | For each month end M: payroll of records valid on M, converted with rate as-of M | Uses `salary_records` ranges, not current snapshot |

Equal-value categories for pay-gap analysis: `job_level × job_family` (proxy, stated in the UI).

## SQL approach

- One view `employee_comp` (see data-model) is the base for everything "current". Group-bys
  run on it with `GROUP BY` + `percentile_cont`. At 10k rows these are < 50 ms with the
  indexes listed; measured in Phase 4 and recorded in `docs/perf.md`.
- Trend uses a generated month series (`generate_series`) joined to `salary_records` on
  `daterange(effective_from, effective_to,'[)') @> month_end`, with `LATERAL` rate lookup.
- Band positioning returns one row per employee (anonymised `employee_code`, level,
  penetration, position) for hr roles; for viewers the API returns counts per level/position.
- Pay gap: per (group, gender) → count, mean, median; the service computes gaps and applies
  the n<5 suppression rule before returning.
- All analytics queries are read-only and run on the pooled connection with
  `statement_timeout = 5s`.

## Caching and invalidation

Memoise analytics responses in-process for 60 s keyed by (route, normalised params,
reporting currency). Bust on any salary/band/fx mutation (service emits `comp.changed`).
On Vercel each instance has its own memo, which is acceptable; document Redis as the
upgrade path.

## Reporting currency rules in the UI

- Figures converted from another currency carry "≈" and a tooltip with the rate and as-of.
- Totals state `unconvertedCount` when any employee could not be converted.
- Local-currency figures (profile, directory salary column) never change with the switch.

## Tests (examples the implementation must include)

- Domain: compa-ratio and penetration on fixture bands; rounding of conversions (banker's);
  rate derivation `rate(a→b) = rate(USD→b)/rate(USD→a)` with exact decimals.
- SQL on PGlite: a 12-employee fixture with known values → summary, breakdown by country,
  percentiles (hand-computed), band positions, pay gap with suppression, trend across a
  salary change boundary.
- API: viewer gets counts not points for band positioning; `asOf` in the past picks the
  earlier FX rate and the earlier salary record.
