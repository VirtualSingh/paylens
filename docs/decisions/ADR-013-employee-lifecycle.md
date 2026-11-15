# ADR-013 — Terminated is final; a termination closes the open salary; a rehire is a new record

- **Status:** Accepted
- **Date:** 2026-11-15
- **Deciders:** Pushpendra (with Claude)

## Context
F-11 asks for terminate / reactivate with an effective date and no hard deletes. History is
immutable (ADR-005): a salary record may only gain an end date. The seed already ends a
leaver's last record on `termination_date`. "Reactivate" could mean undoing a termination,
which would need a closed record reopened — an UPDATE of the past.

## Options considered
1. Any status to any status; reopening a termination clears `termination_date` and the
   salary end date — simple UI, but rewrites history and breaks "the past never changes".
2. Terminated → active allowed, salary left closed; HR records a new salary afterwards —
   keeps history, but a person "active with no salary" is a confusing middle state.
3. active ⇄ on_leave freely; active | on_leave → terminated once; terminated is final and a
   rehire is a new employee record (new code, new hire salary) — history stays whole.

## Decision
Option 3, as the pure function `planStatusChange` in libs/domain. A termination closes the
open salary record on the termination date (the seed's convention), so the date must fall
after that record started; a date before the hire date and an unchanged status are refused.
Each refusal is a 422 with a stable code.

## Consequences
- Positive: no update of history ever; every status change is one audited, If-Match-guarded
  transaction; the rule is tested without a database.
- Negative / accepted risks: a termination entered by mistake cannot be undone in the app
  (v1 answer: add the person again; the mistaken record stays in history and audit).
- Follow-ups: "undo a termination entered by mistake" and "rehire linked to the earlier
  record" are in the backlog.

## Links
F-10, F-11 · ADR-005 · `libs/domain/src/lib/employees/status-change.ts` · commits `af04fcd`, `c113819`.
