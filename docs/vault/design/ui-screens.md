---
title: UI screens — wireframes and behaviour per screen
updated: 2026-11-14
status: active
---

← Continued from [ui.md](ui.md) (tokens, components, voice)

# UI screens

Routes in brackets. Every screen has loading, empty and error states (see ui.md). Role
visibility: `viewer` sees no individual salary figures; `hr_manager` sees everything but
settings; `admin` sees everything.

## 1. Sign in `[/sign-in]`

Centered 400 px column on `paper`: product name, one sentence ("Salary data for ACME,
with its history and its answers."), **Sign in with Google**, a divider, **Continue as demo
HR manager** (visible only when demo mode is on, with a small note "Demo data, resets
nightly"), and a second quiet link "Continue as demo viewer" to show role masking.

## 2. App shell

```
┌──────────┬──────────────────────────────────────────────────────────────┐
│ PayLens  │  ⌕ Search people or press ⌘K          Reporting: USD ▾   ◯ PS │
│          ├──────────────────────────────────────────────────────────────┤
│ Dashboard│                                                              │
│ People   │                      <route content>                         │
│ Pay bands│                                                              │
│ Imports  │                                                              │
│ Audit log│                                                              │
│ Settings │                                                              │
│          │                                                              │
│ ◐ demo   │                                                              │
└──────────┴──────────────────────────────────────────────────────────────┘
```
Nav collapses to icons under 1024 px; on mobile it becomes a sheet. The demo badge is
visible whenever the session is a demo session.

## 3. Dashboard — "How ACME pays people" `[/]`

```
How ACME pays people                                   as of 14 Nov 2026 · USD ▾
Where people sit in their bands                                   ⓘ formula
IC6  ····●●●●●●●●●●●●●●●●●●●●●◆◆····                         min ┊ mid ┊ max
IC5  ·▲▲●●●●●●●●●●●●●●●●●●●●●●●●●●◆◆
IC4  ▲▲▲●●●●●●●●●●●●●●●●●●●●●●●●●●●●●◆
 …   (one strip per level; dots = employees by range penetration; shape = position)
┌─ Headcount ───┬─ Annual payroll ─┬─ Median salary ─┬─ Within band ──┐
│ 10,000        │ ≈ $812.4M        │ ≈ $71,300        │ 86% · 1,412 outside│
└───────────────┴──────────────────┴──────────────────┴────────────────┘
Payroll by country, stacked by department   │  Median by level with band overlay
[bar chart]                                  │  [bars + band range marks]
Pay gap by level (median, gender) ⓘ          │  Payroll trend, 24 months
[dot plot with n per group; suppressed <5]   │  [line, two series]
Ask about pay ─────────────────────────────────────────────────────────────
[ What is our median salary in Germany for IC4?                  Ask ]
Suggested: "Total payroll in EUR" · "Who is below band in Sales?" · "Headcount by country"
```
Hero = the band strip plot (the one orchestrated load animation). Each chart has a table
view toggle and an export. Viewers see counts in the strip plot (no hover to individuals).

## 4. People directory `[/people?q=&country=&department=&level=&status=&band=&sort=&page=]`

```
People                                              Import ▾   Export CSV   + Add employee
⌕ Search name, code or email      Country ▾  Department ▾  Level ▾  Status ▾  Band ▾   Clear
Showing 1–50 of 10,000                         Columns ▾  Density ▾  Saved views ▾
┌─────────────────────┬────┬──────┬─────────────┬─────┬─────────────┬───────────┬──────────┬───────────┐
│ Name ▴              │Code│ Ctry │ Department  │ Lvl │ Salary (loc)│ ≈ Annual $│ Band     │ Compa     │
├─────────────────────┼────┼──────┼─────────────┼─────┼─────────────┼───────────┼──────────┼───────────┤
│ Aarav Mehta         │0421│ IN   │ Engineering │ IC4 │ ₹28,50,000  │ ≈ $34,100 │ ▂▂●▂▂▂▂  │ 0.96      │
│ …                                                                                                  │
└─────────────────────┴────┴──────┴─────────────┴─────┴─────────────┴───────────┴──────────┴───────────┘
                                                             ‹ 1 2 3 … 200 ›   50 / page ▾
```
Server-side everything; row click → profile; Enter on focused row opens; Shift-click
selects for export. Viewers see the table without the three money columns.

## 5. Employee profile `[/people/:id]`

```
← People                                                      Change salary   ⋯
Aarav Mehta   ACME-000421 · Engineering · Software Engineer · IC4 · Bengaluru, IN
Manager: Priya Nair · Hired 12 Mar 2019 · Full-time · Active

Current pay                                   Band IC4 · India · as of 14 Nov 2026 ⓘ
₹28,50,000 / year   ≈ $34,100 (USD, rate as of 1 Nov 2026)
min ₹24,00,000 ──────────●────┊────────── max ₹36,00,000     compa-ratio 0.96 · penetration 38%

Tabs: Salary history | Details | Audit
Salary history
 12 Mar 2019  ₹18,00,000  hire                 by import
 01 Apr 2021  ₹21,50,000  merit (+19.4%)       by Priya N.
 01 Apr 2023  ₹25,00,000  promotion IC3→IC4    by Priya N.
 01 Apr 2025  ₹28,50,000  merit (+14%)         by Priya N.     [chart of the same]
```

## 6. Change salary (right sheet, 480 px) — the flagship interaction

```
Change salary — Aarav Mehta
Effective from   [ 01 / 01 / 2027 ]   (must be after 1 Apr 2025)
New salary       [ ₹ 31,00,000 ] / year    currency fixed: INR
Reason           ( ) Merit  (•) Promotion  ( ) Market adjustment  ( ) Correction  ( ) Other
Note             [ Promotion to Senior Engineer approved in Q4 calibration          ]
Preview
 Change          +₹2,50,000 · +8.8%
 Band IC4 · IN   compa-ratio 0.96 → 1.04 · within band
 ⓘ Promotion to IC5? Change the level in Details first so the preview uses the IC5 band.
                                                   Cancel        Record change
```
Pessimistic save; `If-Match` from the loaded version; 409 → "This record changed since
you opened it. Reload to continue." Success toast repeats the verb and the effective date.

## 7. Pay bands `[/pay-bands?country=&level=]`

Matrix view (levels × countries) with min/mid/max in local currency, headcount in band,
below/above counts as small amber/plum chips; click a cell → band detail with the strip of
employees in that band and the band history. Admin: edit creates a new effective-dated band.

## 8. Import wizard `[/imports/new]` → `[/imports/:id]`

Steps shown as a horizontal stepper (this *is* a sequence): Upload → Map columns →
Validate → Preview → Done. Mapping auto-detects headers (`Employee ID`, `Base Salary`,
`Currency`, `Effective Date` …) and shows a sample row. Validation lists row-level errors
("Row 212: currency GBP does not match country DE") with a download of the error CSV.
Preview: "9,874 rows will be imported, 126 skipped." Commit is transactional. Imports list
shows history with who/when/counts.

## 9. Audit log `[/audit?entityType=&actor=&from=&to=]`

Timeline rows: time, actor, action, entity link, before → after diff (collapsed), request
id. Filterable; exportable. Every row links back to the employee.

## 10. Settings `[/settings]` (admin)

Reporting currency; FX rates table with "add rate as of date"; users & roles; demo mode
indicator (read-only, from env).

## 11. Ask about pay (panel on dashboard, also `[/ask]`)

Question → streamed answer → "How this was computed": list of tools called with their
parameters (e.g. `breakdown(by=country, metric=median, currency=USD, asOf=2026-11-14)`),
model name, and a thumbs up/down. Off-topic questions get a one-line refusal with examples.
Viewers get aggregate-only answers and the panel says so.
