# Demo video script (4–5 minutes)

Record at 1440×900, light theme, reporting currency USD, demo data freshly reset, Neon and
Vercel warmed (open the dashboard once before recording). Speak slowly; show, don't narrate
the obvious. Plan the "change salary" employee and the three assistant questions beforehand.

| Time | Screen | Say (roughly) |
|---|---|---|
| 0:00–0:20 | Sign-in page | "PayLens replaces ACME's salary spreadsheets with one audited, multi-currency source of truth for 10,000 employees in eight countries. I'll sign in as the demo HR manager — reviewers don't need a Google account." |
| 0:20–1:05 | Dashboard | "This is 'How ACME pays people'. The strip plot shows every employee's position in their pay band by level — shapes mark below, within, above. Payroll in USD with the rate's as-of date; median and percentiles, not just averages. Every number has its formula here (open ⓘ). Switch reporting currency to EUR — everything recomputes; local salaries don't change." |
| 1:05–1:50 | People directory | "Ten thousand rows, server-side search, filters and sort — p95 under 300 ms. Filter Germany, IC4, below band. The band bar is on every row. Click into a profile." |
| 1:50–2:40 | Profile → Change salary | "Full effective-dated history — nothing is ever overwritten. Record a change: effective date, amount, reason. The preview shows the new compa-ratio and band position using the same code the server uses. Save — the timeline, the directory and the audit log all update; here is the audit entry with before and after." |
| 2:40–3:15 | Import wizard | "Migration from Excel: upload this sample CSV, columns are auto-mapped, row-level validation explains every rejected row, download the error report, commit transactionally." |
| 3:15–3:50 | Ask about pay | "Natural-language questions answered only through read-only tools: 'median salary for IC4 in Germany', 'who is below band in Sales' — it returns employee codes, never names with salaries — and 'payroll trend last 24 months'. 'How this was computed' lists the tools and parameters. Fifteen evaluation cases run in CI." |
| 3:50–4:10 | Viewer role | "Sign in as a viewer: no individual salaries anywhere, dashboard shows counts only, the assistant answers with aggregates. Deny-by-default roles, tested as a matrix." |
| 4:10–4:40 | Code: `git log`, matrix test, an ADR | "Built test-first — the history reads test, feature, refactor. The authorization matrix test covers every role and every mutating route. Decisions are recorded as ADRs, including what I deliberately left out and why." |
| 4:40–5:00 | README | "Live link, five-minute local setup, security and performance notes, and how AI tools were used — including where I overrode them. Thanks." |

Checklist before recording: demo data reset · currency USD · the chosen employee has ≥ 3
history rows · sample CSV at hand · assistant provider key funded · browser zoom 100% ·
notifications off · mic test.
