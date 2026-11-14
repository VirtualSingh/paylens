# ADR-008 — Deploy web and API as two Vercel projects over Neon Postgres, with a same-origin rewrite

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
Constraints from Pushpendra: free, reliable for weeks unattended, operable by agents via
official MCP servers/CLIs, "easily deployable, scalable". Research (2026-11-14): Vercel has an
official remote MCP and deploys NestJS zero-config as one Function on Fluid compute; Neon has
an official MCP, scales to zero after 5 idle minutes on the free plan and resumes automatically;
Supabase free pauses after a week idle (manual restore); Render free sleeps 15 min with ~1 min
wake and its MCP cannot create free services; Railway's free plan is $1/month of credit;
Cloud Run needs a billing account.

## Options considered
1. **Vercel (web static + api function) + Neon** — all free, both with MCPs, no sleeping-to-death state.
2. Vercel + Supabase (DB + Auth) — one vendor, known to Pushpendra; pause risk for the demo link.
3. Render web service + Postgres — sleeps; free Postgres is time-limited.
4. Cloud Run container + Neon — best "scalable" story; billing account friction. Kept as a documented alternative (Dockerfile).

## Decision
Option 1. Web project rewrites `/api/:path*` to the API project so cookies stay first-party and
there is no CORS. Migrations run in the API build step when `RUN_MIGRATIONS_ON_BUILD=true`
(small-app trade-off; a CI migrate job is the upgrade path). Seed production once via CLI.
Dockerfile keeps the API Cloud-Run-ready.

## Consequences
- Positive: zero cost, Git-push deploys, previews per PR, agent-operable, one origin.
- Negative: function cold starts and Neon resume add latency on first request (document it);
  in-process caches and rate limits are per instance; Hobby plan is for non-commercial use (fine for an assessment).
- Follow-ups: verify the walking skeleton in Phase 0; if NestJS zero-config fails, fall back to an
  `api/index.ts` adapter or Cloud Run.

## Links
docs/vault/design/deployment.md · docs/vault/design/architecture.md · F-33
