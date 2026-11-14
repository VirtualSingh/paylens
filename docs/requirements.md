# PayLens — Requirements (one page)

**Author:** Pushpendra Singh · **Date:** 2026-11-14 · **Status:** v1 — written before any code

## Goal

Give ACME's HR manager one trustworthy place to manage salary data for 10,000 employees
across eight countries — replacing spreadsheets — and let her answer "how does the
organisation pay people?" in seconds, with every number traceable to its formula, its
currency and its date.

## Users

- **HR manager (primary):** records and corrects salaries, imports existing sheets, answers leadership questions.
- **Finance partner / analyst (read-only):** totals and distributions in one reporting currency.
- **Auditor:** who changed what, when and why.

## Scope — v1

1. **Employee directory** over 10,000 rows: search by name/code/email; filter by country,
   department, level, status and band position; sort; server-side pagination. Target p95 < 300 ms.
2. **Employee profile** with employment details, current pay in local and reporting currency,
   position in pay band (compa-ratio, range penetration) and the full **effective-dated salary history**.
3. **Record a salary change** with effective date, amount, reason and note; preview of the
   change before saving; the past is never overwritten — corrections are new records.
4. **Pay bands** per job level × country (min/mid/max), effective-dated; outliers flagged.
5. **Multi-currency**: money stored in minor units with its currency; dated FX table;
   switchable reporting currency (USD default); every converted figure says so.
6. **Analytics**: headcount, annual payroll, median and percentiles; breakdowns by country,
   department, level and job family; band positioning; trend over time; gender pay gap by
   category with small-group suppression (mirrors EU Pay Transparency Directive reporting).
7. **Import/export**: CSV import wizard (map columns → validate with row-level errors → preview → commit) and CSV export.
8. **Access and governance**: Google sign-in; roles admin / HR manager / viewer (viewers see
   no individual salaries); one-click demo login for reviewers; immutable audit log of every change.
9. **"Ask about pay" assistant**: natural-language questions answered only through read-only,
   role-aware analytics tools, showing which computation was used; evaluated with a test suite.
10. **Platform**: deployed (Vercel + Neon Postgres), seeded with 10,000 realistic employees,
    OpenAPI docs, CI with tests and security scans, accessibility to WCAG 2.2 AA.

## Non-functional requirements

Fast and deterministic tests (< 60 s, no network); TDD visible in commit history; security
controls mapped to OWASP Top 10:2025 with a documented threat model; no PII or salaries in
logs or sent to the language model; stateless API designed to scale from 10k to 100k employees.

## Deliberately left out (and why)

| Out of scope | Reasoning |
|---|---|
| Merit/bonus cycle planning, approval workflows | Workflow products in their own right; the system of record and analytics must exist first. One persona needs no approval states. |
| Payroll processing, payslips, tax | Different regulatory domain; PayLens informs payroll, it does not run it. |
| Benefits, equity, bonuses | Needs its own data model; base salary proves the architecture. |
| Market benchmarking | Requires a licensed dataset; bands are seeded instead. |
| HRIS/payroll integrations, employee self-service | API-first design leaves the door open; both would double the scope. |
| Micro-frontends, Chrome extension | No user job here needs them; they would add complexity without proving more engineering judgment. |
| Live FX feeds, UI translations, dark mode | The dated FX table proves the model; the rest are polish for v2. |

## Assumptions

One global job-level framework; one currency per country; base salary only; data in the
demo is synthetic; the organisation's reporting currency is USD unless changed in settings.

## Success criteria

Reviewer runs it locally in under 5 minutes; the seven canonical HR questions are answered
from the deployed dashboard; every mutation leaves an audit event; the authorization test
matrix is green; the commit history reads as test → feature → refactor.
