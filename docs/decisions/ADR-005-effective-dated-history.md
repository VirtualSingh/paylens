# ADR-005 — Model salary as effective-dated, append-only records guarded by a database exclusion constraint

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
HR must see pay history, run trends over time, and prove who changed what. Spreadsheets
lose history by overwriting cells. Future-dated changes (planned raises) and corrections of
past mistakes both happen.

## Options considered
1. Single `salary` column on `employees` + separate change log — simple reads; history is
   second-class and trends are approximations.
2. **Effective-dated `salary_records` (`[effective_from, effective_to)`)** with the current
   record open-ended; corrections as new records — true temporal model; more query care.
3. Full bitemporal (valid time + transaction time) — most rigorous; overkill for v1.

## Decision
Option 2, with the invariant enforced in the database: `EXCLUDE USING gist (employee_id WITH =,
daterange(effective_from, effective_to, '[)') WITH &&)`. Only `effective_to` is ever updated
(closing a record); everything else is INSERT. A `correction` reason allows re-slicing history
inside one transaction. Every mutation writes an append-only audit event with before/after.

## Consequences
- Positive: trends are exact; audit answers "how was this arrived at"; a service bug cannot
  create overlapping periods; future-dated raises are first-class.
- Negative: "current salary" needs a view/partial index; corrections need careful transaction
  code. Mitigation: `current_salaries` view, partial index, domain function `planSalaryChange`
  with exhaustive tests.
- Follow-ups: transaction-time (when we *knew*) is approximated by `created_at`; add true
  bitemporal only if an auditor asks.

## Links
docs/vault/design/data-model.md · docs/vault/design/architecture.md (sequence) · F-08, F-09, F-04
