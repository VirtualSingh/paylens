---
title: PayLens — product
updated: 2026-11-14
status: active
---

# PayLens — product

**One line:** PayLens replaces the HR team's salary spreadsheets with a single, audited,
multi-currency source of truth — and lets the HR manager ask "how do we pay people?" and
get a defensible answer in seconds.

Working title. Rename freely before submission; the code uses `paylens` as the package
scope so a rename is one search-and-replace.

## Who it is for

**Primary persona — the HR manager (Priya, Head of People Operations, ACME).**
Owns salary data for 10,000 employees across 8 countries. Today: dozens of Excel files,
emailed around, with formulas nobody trusts. Her week is interrupted by questions she
cannot answer quickly ("what's our median engineering salary in Germany?", "who is paid
below band?", "what did payroll cost last quarter in USD?") and by changes she must
record carefully (promotions, merit raises, corrections) without losing the history.

**Secondary personas.** The finance partner (read-only, wants totals in one currency);
the compensation analyst (wants distributions, bands, outliers); the auditor (wants to
know who changed what, when and why).

## The two jobs to be done

1. **Manage salary data safely.** Find anyone fast; see the full pay history; record an
   effective-dated change with a reason; import the existing spreadsheets without losing
   a row; never overwrite the past; always know who did what.
2. **Answer "how does the org pay people?"** Totals, medians and percentiles by country,
   department and level in one reporting currency; where people sit in their pay bands;
   outliers; trends over time; pay-gap by category; and a natural-language assistant that
   answers with the exact computation it used.

## Why now (product framing you can defend)

- Spreadsheet-based compensation is the status quo and its failure modes are well
  documented: version chaos, silent formula errors, no audit trail, data leaks via emailed
  files. See [product/pain-points.md](product/pain-points.md).
- The EU Pay Transparency Directive is in force since June 2026: pay structures must be
  gender-neutral, employees can request pay information, and employers with 100+ staff
  must report mean/median gender pay gaps (large employers from June 2027). An HR team on
  spreadsheets cannot produce that defensibly. See [product/market-research.md](product/market-research.md).
- Market tools (Pave, Ravio, Lattice, Figures, Aeqium) sell bands, benchmarking, merit
  cycles and pay-equity analytics to companies that already left spreadsheets. PayLens is
  the on-ramp: the system of record and the analytics, without the benchmarking dataset.

## Scope at a glance

Full list with IDs in [product/features.md](product/features.md). Summary:

| In v1 (assessment build) | Deliberately out (and why) |
|---|---|
| Employee directory over 10k rows: search, filter, sort, server-side paging | Merit/bonus cycle planning — a workflow product in itself; v2 |
| Employee profile with effective-dated salary history and audit trail | Payroll processing, payslips, tax — different regulatory domain |
| Record a salary change (effective date, reason, note) with band preview | Benefits, equity, bonuses — total rewards, needs its own model |
| Pay bands by level × country; compa-ratio, range penetration, outliers | External market benchmarking — needs a licensed dataset |
| Multi-currency with dated FX rates and a switchable reporting currency | Live FX feeds — static dated table is enough to prove the model |
| Analytics: payroll, headcount, median/percentiles, breakdowns, trend, pay gap | Approval workflows — one persona; approvals add states without proving more |
| CSV import wizard (map → validate → preview → commit) and export | HRIS/payroll integrations — API-first design leaves the door open |
| Google sign-in, roles (admin / hr_manager / viewer), demo login | Employee self-service — different audience and auth surface |
| Immutable audit log of every change | Micro-frontends — organisational solution without an organisational problem |
| "Ask about pay" assistant (Mastra agent over read-only tools, with evals) | Chrome extension — named in the JD, but not a fit for this brief |

## Product principles

1. **The past is never overwritten.** Every salary is a dated record; corrections are new records.
2. **One number, one meaning.** Local currency where money is paid; reporting currency where it is compared; the UI always says which.
3. **Answers come with their working.** Every metric shows its formula; the assistant shows the tools it called.
4. **Least privilege by default.** Viewers see aggregates; HR managers see people; admins see settings.
5. **Fast at 10,000, designed for 100,000.** Server-side everything; indexes before features.
6. **Boring where it should be boring.** Conventional React/Nest patterns, no clever abstractions — the reviewer must be able to read it.

## Success criteria for the assessment build

- A reviewer can clone, `pnpm install`, `pnpm db:seed`, `pnpm dev` and use the app in < 5 minutes.
- Deployed demo answers the five canonical HR questions (see [design/analytics.md](design/analytics.md)) in < 1 s each.
- Directory list p95 < 300 ms at 10,000 rows; every mutation produces an audit event.
- Test suite runs in < 60 s locally, deterministic, with the authorization matrix green.
- Commit history reads as a TDD narrative; every decision has an ADR.

## Related

[product/features.md](product/features.md) · [product/coverage-matrix.md](product/coverage-matrix.md) · [design.md](design.md) · [plan.md](plan.md) · `../requirements.md`
