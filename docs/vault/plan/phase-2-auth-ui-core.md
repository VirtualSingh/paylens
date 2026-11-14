---
title: Phase 2 — Auth, roles, audit, and the core UI (directory, profile, change salary)
updated: 2026-11-14
status: active
window: 2026-11-16 → 2026-11-17
---

# Phase 2 — Auth + UI core

**Goal:** a real user can sign in (Google or demo), see the directory and a profile, and
record a salary change that shows up in history and the audit log — with roles enforced and
tested. The frontend framework decision must be final before 2.3 (ADR-003).
**Entry:** Phase 1 exit checklist green; recruiter answer recorded in `progress.md`.

## Tasks

### 2.1 Authentication and sessions (≈ 2.5 h)
- `GoogleTokenVerifier` interface + real implementation (`google-auth-library`, checks
  `aud`, `iss`, `exp`, `email_verified`) + fake for tests.
- `SessionService`: create (random 32 bytes → cookie; SHA-256 hash stored), validate with
  sliding/absolute expiry, revoke; `SessionGuard` sets `req.user`.
- `POST /auth/google`, `/auth/demo` (gated by `DEMO_MODE`), `/auth/logout`, `GET /auth/me`.
  First login creates the user with role from `ADMIN_EMAILS` / `ALLOWED_EMAIL_DOMAINS`
  (default `viewer`; unknown domains rejected unless demo).
- Cookie `__Host-pl_session`, `httpOnly; Secure; SameSite=Lax`; CSRF origin check middleware
  for mutations; throttling on auth routes.
- Remove the Phase 1 `X-Dev-Role` shim. Tests: forged/expired/wrong-aud tokens → 401; expiry;
  logout revokes; demo disabled in prod config → 404.

### 2.2 Roles, masking, audit (≈ 2 h)
- `@Roles()` + `RolesGuard` (deny by default — a route without the decorator fails a startup
  assertion test that walks the router), policy helpers in services.
- Viewer masking: `EmployeeMaskedDto`; `GET /employees` and `/employees/:id` branch on role.
- `AuditInterceptor` + `AuditService.append` inside the service transaction for every mutation;
  `GET /audit`, `GET /employees/:id/audit`.
- **Authorization matrix test**: table-driven spec over every mutating route × {anonymous,
  viewer, hr_manager, admin} asserting 401/403/2xx. This test is the headline of the README's
  security section.
Commits: `test(auth): viewer cannot read salary history` → `feat(auth): roles guard and masked DTOs` → `test(audit): every mutation writes one audit event` → `feat(audit): append-only audit log`.

### 2.3 Web foundation (≈ 2 h) — React default (Angular: same steps with PrimeNG/signals)
- Tokens → Tailwind theme; typography (Plex Sans, tabular nums); shadcn primitives themed.
- App shell per ui-screens.md: nav, top bar with ⌘K (`cmdk`) and reporting-currency switch,
  demo badge, `RequireRole` route guards, sign-in page with Google button + demo buttons.
- API client: typed fetch with Zod parsing, problem+json mapping, request-id header.
- Session hook (`/auth/me`), sign-out, 401 → sign-in redirect.
- Component tests: shell nav, sign-in renders demo buttons only when demo is on, role guard.

### 2.4 Directory (≈ 3 h)
- `DataTable` (TanStack, server mode): sticky header, `aria-sort`, keyboard nav, column
  chooser, density, selection. `FilterBar` with multi-select popovers and chips. URL-synced
  state. `BandBar sm` and `MoneyText` in rows; viewer variant hides money columns.
- Tests: renders rows from MSW; sort click updates URL and refetches; viewer masking; axe clean.

### 2.5 Profile, history, change salary (≈ 3 h)
- Profile header, current pay block with `BandBar lg`, tabs (history / details / audit).
- `SalaryTimeline` list + ECharts step line; `Timeline` for audit.
- `SalaryChangeSheet`: react-hook-form + shared Zod schema; preview computed with
  `@paylens/domain` `bandMetrics` (same function as the server); pessimistic submit with
  `If-Match`; 409 handling; success toast; invalidates profile, history, directory queries.
- Tests: preview math; validation messages from schema; 409 message; a11y of the sheet.

### 2.6 Employee create/edit and status (≈ 1.5 h)
- "Add employee" sheet (details + initial salary), "Edit details" sheet, status change with
  typed-code confirmation for termination. Tests on validation and optimistic concurrency.

### 2.7 Google OAuth consent screen (Pushpendra, 15 min, in parallel)
- Create OAuth client (web), authorised origins = prod + localhost; consent screen External,
  basic scopes, **Publish**. Put client id in Vercel env and `.env`. Agent verifies login on prod.

## Exit checklist

- [ ] Demo sign-in → directory → profile → record change → history + audit updated, on the **deployed** app
- [ ] Viewer sees no salary figures anywhere (UI and API tests)
- [ ] Authorization matrix test green and referenced in README
- [ ] axe clean on sign-in, directory, profile, sheet; keyboard-only run-through done once by Pushpendra
- [ ] ADR-003 final, ADR-006 written; `progress.md` updated

## Notes for the agent

- Build the sheet's preview from the same domain function the API uses; this is the "one
  number, one meaning" principle and a great interview talking point.
- Keep React conventional (hooks + Query + Router). No custom state libraries, no HOCs.
- Angular variant: `p-table` lazy mode with `onLazyLoad` → service → signals; sheets via
  `p-drawer`; forms reactive with Zod-derived validators.
