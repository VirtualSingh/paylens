---
title: Frontend implementation — React default, Angular variant
updated: 2026-11-15
status: active — Variant A (React) is final (D-1 closed 2026-11-15); Variant B kept for the record only
---

# Frontend implementation

The UI design ([ui.md](ui.md)) is framework-agnostic. This file says how to build it.
**Default is Variant A (React).** Switch to Variant B only if the recruiter confirms Angular
is acceptable for this role; record the final choice in ADR-003 and `progress.md`.
Everything outside `apps/web` is identical in both variants.

## Variant A — React (default)

| Concern | Choice | Why (one line, for the interview) |
|---|---|---|
| Build | Vite 8, React 19, TypeScript strict | Fast, boring, what the ecosystem expects |
| Styling | Tailwind CSS v4 with design tokens as CSS variables (`@theme`) | Tokens in one place; dark mode later for free |
| Components | shadcn/ui (Radix primitives copied into `src/ui/`) | Accessible by default; the code is ours to read and theme |
| Tables | TanStack Table (headless) + shadcn table primitives, server-side mode | Full control over 10k-row directory; no vendor grid lock-in |
| Server state | TanStack Query v5 | Caching, retries, optimistic updates, devtools |
| Routing | React Router v7 (data mode), lazy routes per feature | Familiar; URL carries list state |
| Forms | react-hook-form + `@hookform/resolvers/zod` with schemas from `libs/shared` | Same validation as the API, zero duplication |
| Charts | Apache ECharts via `echarts-for-react` | Handles 10k-point strip plots; Pushpendra already knows ECharts |
| Command palette | `cmdk` (shadcn Command) | ⌘K navigation + employee search |
| Icons / fonts | lucide-react; `@fontsource-variable/ibm-plex-sans` self-hosted | No third-party font requests (privacy, CSP) |
| Dates / money | date-fns; `Intl.NumberFormat` via `MoneyText` | Tabular numerals, correct minor units |
| Tests | Vitest + Testing Library + `vitest-axe`; Playwright for journeys | Fast, behaviour-focused, a11y asserted |

Folder layout:
```
apps/web/src/
├─ app/            router, providers (Query, Theme, Session), layout shell
├─ ui/             shadcn primitives (button, dialog, sheet, table, command, toast …)
├─ components/     PayLens composites: BandBar, MoneyText, DataTable, PercentileStrip, EmptyState, PageHeader
├─ features/
│  ├─ auth/        SignInPage, useSession, RequireRole
│  ├─ people/      DirectoryPage, EmployeePage, SalaryChangeSheet, SalaryTimeline
│  ├─ bands/       PayBandsPage, BandEditor
│  ├─ analytics/   DashboardPage, charts, AskPanel
│  ├─ imports/     ImportWizard (Upload → Map → Validate → Preview → Done)
│  ├─ audit/       AuditPage
│  └─ settings/    SettingsPage, FxRatesTable, UsersTable
├─ lib/            api client (fetch + zod parse), query keys, formatters, hooks
└─ styles/         tokens.css, globals.css
```

Rules:
- One hook per server interaction (`useEmployees(params)`, `useChangeSalary()`); components
  never call `fetch`.
- List pages keep filters/sort/page in the URL (`useSearchParams`), so links are shareable
  and back/forward work.
- Mutations: optimistic for low-risk edits (status, details), pessimistic with a clear
  pending state for salary changes; always invalidate the affected queries.
- Error boundary per route; every data view has loading (skeleton), empty and error states.
- No barrel re-exports that create cycles; feature folders import only from `ui/`,
  `components/`, `lib/` and `libs/shared`.
- Accessibility: shadcn/Radix gives focus management; we add visible focus rings, labels,
  `aria-sort` on table headers, live region for toasts, and `prefers-reduced-motion`.

## Variant B — Angular (only if recruiter allows)

| Concern | Choice |
|---|---|
| Framework | Angular 22, standalone components, signals, zoneless, new control flow |
| Components | PrimeNG (latest) with a custom theme preset; `tailwindcss-primeui` for utilities |
| Tables | PrimeNG `p-table` lazy mode (server-side sort/filter/paging), virtual scroll off (paged) |
| Server state | Services with `HttpClient` + `httpResource`/signals; a small query cache per feature |
| Forms | Reactive forms with validators generated from the shared Zod schemas (`zod-validators` adapter in `libs/shared`) |
| Charts | ngx-echarts |
| Tests | Vitest (Angular's default runner) + Testing Library Angular; Playwright journeys |

Same folder spirit (`features/*`, `shared/components`, `core/` for interceptors and guards).
Route guards map to the API roles; an `HttpInterceptor` adds `x-request-id` and handles
problem+json → toast. The design tokens in [ui.md](ui.md) are applied through the PrimeNG
theme preset so the two variants look the same.

## API client contract (both variants)

- Base URL `/api/v1` (same origin via rewrite/proxy). Credentials included.
- Parse every response with the shared Zod schema in dev/test; surface a typed error.
- Map problem+json to UI: 400/422 → inline field errors (`errors[].path`), 401 → sign-in,
  403 → "You don't have access" page, 409 → "Someone changed this record; reload",
  429 → "Too many requests, try again in a minute".
- Money is rendered only through `MoneyText` (never ad-hoc `toFixed`).

## Performance budget

- Initial JS ≤ 250 KB gzipped (route-level code splitting; ECharts loaded only on
  analytics routes); Lighthouse performance ≥ 90 on the dashboard with seeded data.
- Directory interactions (sort, page, filter) feel instant: Query keeps previous data while
  fetching; API p95 < 300 ms.

## Decision log

- shadcn over MUI: the UI brief is "amazing and easy"; MUI's defaults look like every other
  admin panel, and shadcn components are plain React + Tailwind the candidate can read and
  defend. MUI remains acceptable if Pushpendra prefers it (ADR-003).
- ECharts over Recharts: better with dense strip/beeswarm plots and already in Pushpendra's
  toolbox.
