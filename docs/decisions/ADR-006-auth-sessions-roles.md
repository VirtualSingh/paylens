# ADR-006 — Authenticate with Google Sign-In, keep server-side sessions in a cookie, authorise with three roles and field masking

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
Salary data is sensitive; the brief does not mandate auth but a public demo without it would
be irresponsible. Pushpendra wants Google (GCP) login. Reviewers must get in without a
Google account. The API runs as a stateless function.

## Options considered
1. Supabase Auth / Firebase Auth — managed, quick; adds a vendor and (for Supabase free) a
   pause risk; JWT verification in Nest anyway.
2. Passport Google OAuth code flow in Nest — standard; more redirect plumbing.
3. **Google Identity Services ID token → verified server-side → opaque session cookie** —
   minimal vendor surface, revocable sessions, no tokens in browser storage.
4. JWT access tokens in localStorage — stateless; XSS-exposed and non-revocable; rejected.

## Decision
Option 3. Sessions table with hashed tokens; cookie `__Host-pl_session` (httpOnly, Secure,
SameSite=Lax), sliding 12 h / absolute 7 d; CSRF defended by same-origin rewrite + Origin
check. Roles `admin` ⊇ `hr_manager` ⊇ `viewer`, deny by default via `@Roles`, with masked
DTOs so viewers never receive individual salary fields. `DEMO_MODE` enables one-click demo
sessions for seeded demo users (flagged, throttled, cannot change settings).

## Consequences
- Positive: revocation works; no password handling; tiny attack surface; demo path for reviewers.
- Negative: sessions in Postgres add a query per request (cheap, indexed); Google consent
  screen must be published to avoid test-user limits. Mitigation: publish early (Phase 2.7).
- Follow-ups: SSO/SCIM and per-team manager scopes are v2.

## Links
docs/vault/design/security.md · docs/vault/design/api.md (Auth) · F-01, F-02, F-03
