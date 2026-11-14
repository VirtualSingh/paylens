---
title: Glossary — compensation vocabulary used in code, UI and docs
updated: 2026-11-14
---

# Glossary

One word per concept, used identically in code identifiers, API fields, UI copy and docs.

| Term | Meaning | In code |
|---|---|---|
| Base salary | The recurring cash pay for the role, before bonus/allowances. PayLens v1 models only base salary. | `salary_records.amount_minor` |
| Minor units | The smallest currency unit (cents, paise). All money is stored as integers of minor units. | `amountMinor: bigint` |
| Pay frequency | How the amount is expressed: `annual` or `monthly`. Annualised for analytics. | `pay_frequency` |
| Effective-dated | A record valid from `effective_from` until `effective_to` (exclusive). History is a chain of such records. | `EffectivePeriod` |
| Current salary | The record valid today (`effective_to IS NULL` or in the future). | `current_salaries` view |
| Reason | Why a salary changed: hire, merit, promotion, market adjustment, correction, transfer, other. | `salary_reason` |
| Correction | A new record that fixes history; never an edit of an old row. | `reason = correction` |
| Pay band (salary range) | For a job level in a country: minimum, midpoint, maximum in local currency, effective-dated. | `pay_bands` |
| Midpoint | The band's reference point for "market" pay. | `mid_minor` |
| Compa-ratio | Salary ÷ band midpoint. 1.00 = at midpoint; 0.90 = 10% below. | `compaRatio` |
| Range penetration | (Salary − min) ÷ (max − min). 0 = at minimum, 1 = at maximum; outside 0–1 = outside band. | `rangePenetration` |
| Band position | `below`, `within`, `above` relative to min/max. | `bandPosition` |
| Outlier | An employee whose salary is outside their band. | `listOutliers` |
| Compression | When pay differences within a level are unusually small (p75/p25 low) — often new hires catching up with tenured staff. | `compressionIndex` |
| Job level | Global career level: IC1–IC6 (individual contributor), M1–M4 (manager). | `job_levels` |
| Job family | Broad discipline grouping (Software, Data, Go-to-market …). | `job_families` |
| Equal-value category | Group of roles considered comparable for pay-gap analysis; PayLens uses level × job family as a proxy. | `payGap.groupBy` |
| Local currency | The currency the employee is paid in (fixed by country in v1). | `currency_code` |
| Reporting currency | The single currency used to compare and total across countries (default USD). | `settings.reporting_currency` |
| FX rate (as-of) | Exchange rate valid on a date; conversions pick the latest rate on or before the as-of date. | `fx_rates` |
| Annual payroll | Sum of annualised current salaries converted to the reporting currency. | `summary.annualPayroll` |
| Headcount | Count of active employees as of a date. | `summary.headcount` |
| Median / percentile | `percentile_cont` continuous percentiles of annualised reporting-currency salary. | `p50`, `p25`, `p75`, `p90` |
| Pay gap | (Reference group mean or median − comparison group) ÷ reference; shown as % with group sizes; suppressed under n < 5. | `payGap` |
| Audit event | Immutable record of who did what to which entity, with before/after. | `audit_events` |
| Actor | The user (or `system`/`import`) that performed an action. | `actor_user_id` |
| Session | Server-side login state referenced by an opaque cookie. | `sessions` |
| Role | `admin` (settings + everything), `hr_manager` (manage people and pay), `viewer` (aggregates; no individual salaries). | `user_role` |
| Masked | A response variant with salary fields removed for viewers. | `EmployeeMaskedDto` |
| Demo mode | Environment flag enabling one-click demo logins with seeded demo users. | `DEMO_MODE` |
| Import job | One uploaded CSV with mapping, validation results and commit state. | `import_jobs` |
| Dry run | Validation without writing; the default first step of an import. | `status = validated` |
| Tool (assistant) | A typed, read-only function the agent may call; the only way it gets data. | `assistant/tools/*` |
| Eval | A test of the assistant's behaviour (which tools, which refusals), deterministic in CI. | `assistant/evals` |

Avoid: "wage", "pay rate", "comp" (ambiguous), "salary grade" (use level/band), "update salary"
(use "change salary"), "delete employee" (use "terminate").
