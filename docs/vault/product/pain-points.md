---
title: User pain points → the PayLens feature that answers each
updated: 2026-11-14
status: active
---

# Pain points → features

Sources: vendor and consultancy write-ups on spreadsheet-based compensation, G2/Capterra
review themes for compensation tools, HR community posts (summarised via secondary
sources; Reddit was not directly reachable from the research session). Each pain point
maps to a feature ID in [features.md](features.md). Use this table to write the
requirements doc, the README and the demo narrative.

## 1. Pain of running compensation in spreadsheets (the status quo at ACME)

| Pain (as users describe it) | Why it hurts | PayLens answer |
|---|---|---|
| Version chaos: dozens of copies, "which file is final?", managers editing their own copies | Decisions made on stale or conflicting data; weeks of reconciliation | Single system of record (F-06…F-10); optimistic concurrency on edits (F-09) |
| Silent formula errors, broken references, copy-paste mistakes | One wrong cell propagates to payroll, budgets and equity analysis until someone notices | Typed domain logic with tests; money in minor units; validation at every boundary (F-15, F-24) |
| No audit trail: cannot tell who changed what, when or why; evidence reconstructed from emails | Compliance and trust risk; "how was this increase arrived at?" takes four files to answer | Immutable audit log with before/after and reason (F-04, F-08) |
| Salary data emailed around on laptops | Confidentiality breach risk; no access control | Roles, field masking, server-side sessions, no exports for viewers (F-01…F-03, F-25) |
| Manual currency conversion with ad-hoc rates | Country comparisons are wrong or stale; "payroll in USD" is a guess | Dated FX table, reporting-currency switch, every figure labelled (F-15, F-16) |
| Slow answers to leadership questions ("median engineering salary in Germany?") | HR becomes a bottleneck; decisions wait days | Dashboard + assistant answering in seconds with the formula shown (F-17…F-20, F-27) |
| Hard to see who is outside their band or where compression exists | Inequity discovered late (or in court) | Band bar on every row/profile; outlier list; distribution by level (F-14, F-19, F-20) |
| Pay-equity reporting done by hand once a year, if at all | EU directive now requires mean/median gaps and defensible categories | Pay-gap view by category with method note (F-22) |
| Merging data from HRIS exports, surveys, manager sheets | Hours of cleanup every cycle; field mismatches | Import wizard with mapping, validation report and dry run (F-24) |
| Managers do not understand how a number was computed | Fair decisions feel arbitrary | "Show the working" on every metric; assistant lists tools used (principle 3) |

## 2. Pain reported about existing software (G2 / Capterra themes)

| Complaint theme | Frequency signal | How PayLens avoids it |
|---|---|---|
| Slow loading / slow performance, especially when a cycle opens to many users | Top-5 con across the G2 category; recurring in HRSoft, Xactly, Decusoft reviews | Server-side pagination, indexed queries, cached aggregates, performance budget with measured p95 (perf notes) |
| Reporting issues: fixed reports, custom reporting hard, Excel exports need manual re-formatting | Top-5 con; Compease, Decusoft reviews | Every table exportable as clean CSV; analytics endpoints parameterised by dimension; OpenAPI for custom pulls |
| Learning curve / not intuitive | Most frequent con in the category | One mental model (people → pay → bands → analytics), command palette, plain-language copy, empty states that say what to do |
| Not connected to live data; data integration gaps (e.g., SAP HCM) | HRSoft, Compport reviews | API-first with OpenAPI; import wizard; integrations are v2 by design, documented |
| Limited customisation / flexibility | beqom, SuccessFactors reviews | Configurable bands, FX, reporting currency, roles; everything else deliberately simple |
| Post-upgrade bugs, mid-cycle friction needing vendor support | Decusoft reviews | Test suite + CI + migrations with rollback notes; audit log makes recovery explainable |

## 3. Pain specific to global, multi-country organisations

- FX swings and inflation make local salaries drift against bands set in a base currency;
  teams review quarterly and keep bands in both base and local currency → PayLens keeps
  bands in local currency per country and converts for comparison only (F-13, F-15).
- Inconsistent job levelling across countries makes comparisons meaningless → one global
  level framework (IC1–IC6, M1–M4) with country-specific bands (F-13).
- Data arrives in mixed shapes (annual vs monthly, hourly, mixed currencies in one file)
  → pay frequency is explicit on every record and annualised with a documented factor;
  import validation rejects ambiguous rows (F-15, F-24).

## 4. What HR managers say they want from an assistant (synthesised)

Fast, trustworthy, traceable: "give me the number and show me how you got it"; never
expose an individual's salary to someone who should not see it; refuse to guess. These
three sentences are the acceptance criteria for F-27.

## Sources

- Figures: https://figures.hr/post/comp-management-software
- Decusoft FAQ on spreadsheet problems: https://www.decusoft.com/faq/what-problems-do-spreadsheets-cause-in-compensation-planning/
- MorganHR, risks of spreadsheets / spreadsheets vs software: https://morganhr.com/blog/risks-of-managing-compensation-in-spreadsheets/ , https://morganhr.com/blog/compensation-management-software-vs-spreadsheets/
- CompLogix compensation playbook (error causes): https://www.complogix.io/wp-content/uploads/2026/02/The-CompLogix-Compensation-Playbook.pdf
- CompUp on spreadsheet errors: https://www.compup.io/blogs/eliminate-spreadsheet-errors-compensation-review
- Compport, software vs spreadsheets (cost of a merit-matrix misfire): https://www.compport.com/blog/compensation-management-software-vs-spreadsheets
- G2 category pros/cons: https://www.g2.com/categories/compensation-planning/mid-market ; Decusoft alternatives (complaint summary): https://www.compport.com/blog/5-best-decusoft-alternatives-for-comp-teams
- Capterra Compease reviews (export formatting): https://www.capterra.com/p/108972/Compease/reviews/?page=2
- Global comp challenges: https://www.jobspikr.com/?p=39891 , https://www.beqom.com/blog/mastering-compensation-management-global-workforce , https://us.fitgap.com/stack-guides/automated-unit-and-currency-normalization-for-global-compensation-analytics
- Salary compression (Reddit case via secondary source): https://workalizer.com/insights/people-ops-insights/navigating-salary-compression-strategies-for-fair-sustainable-pay/
