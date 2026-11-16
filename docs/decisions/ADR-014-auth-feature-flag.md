# ADR-014 — One flag decides whether people sign in; off by default, acting as demo users

- **Status:** Accepted
- **Date:** 2026-11-16
- **Deciders:** Pushpendra (with Claude)

## Context
PayLens is an assessment: reviewers must be able to open the live app and use every feature
without an account. Google sign-in (ADR-006) must still exist and be switchable on. Both modes
must keep the same contract: roles, masking, If-Match, audit actors in the database.

## Options considered
1. Demo-login buttons only (ADR-006's plan) — still a sign-in step for every reviewer.
2. Open access with no user at all — audit events and `created_by` would have no actor.
3. A flag: off → every request acts as a seeded demo user of a chosen role; on → Google
   sign-in with a server-side session is required.

## Decision
Option 3. `AUTH_ENABLED` (API env; only `true` enables; default off). The web reads it from
public `GET /auth/config`, so one switch changes both. Off: the role comes from the
`x-acting-role` header ("Viewing as" in the top bar; default HR manager) and maps to one of
three demo users created by migration 0003 with fixed ids, so the audit log and salary records
name a real actor. On: `POST /auth/google` verifies the ID token (audience = our client id,
issuer, expiry, verified email), creates the user if allowed, and sets an httpOnly session
cookie (only a SHA-256 of the token is stored); the acting-role header is ignored.

## Consequences
- Positive: zero-friction review; the authorization matrix, viewer masking and audit trail
  behave identically in both modes (tests run both).
- Negative / accepted risks: with the flag off, anyone with the URL can change the demo data.
  It is generated data; `pnpm db:seed` with `SEED_FORCE=yes` resets it. Never run real data
  with the flag off.
- Follow-ups: turn the flag on (Vercel env `AUTH_ENABLED=true`) once the review is over.

## Links
ADR-006 · security.md · `apps/api/src/auth/` · `apps/web/src/lib/session.tsx`
