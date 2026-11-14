---
title: Phase 5 — Ship (final deploy, README, artefacts, video, submission)
updated: 2026-11-14
status: active
window: 2026-11-19
---

# Phase 5 — Ship

**Goal:** everything a reviewer touches is finished: live URL, README that sells the thinking,
complete artefacts, a video, a tagged release, and the submission email.
**Entry:** Phase 4 exit checklist green (or the documented cut list applied).

## Tasks

### 5.1 Production verification (≈ 1 h)
- Fresh browser: demo HR flow, demo viewer flow, Google sign-in with Pushpendra's account
  (admin), import sample CSV, ask three questions, export a CSV. Note any defect → fix → commit.
- Run the deployment checklist in [../design/deployment.md](../design/deployment.md) and the
  security checklist once more on the final build. Reset demo data (`db:reset-demo`).
- Warm the Neon compute and the Vercel function right before recording the video.

### 5.2 README (≈ 1.5 h) — the first thing reviewers read; write it for them
Sections, in order:
1. One paragraph: what PayLens is and the two jobs it does; live URL; demo logins; video link.
2. Screenshots (dashboard hero, directory, profile + change-salary sheet, import wizard, ask panel).
3. Run it in 5 minutes (`pnpm install`, `docker compose up db`, `pnpm db:migrate`, `pnpm db:seed`, `pnpm dev`) and `pnpm test`.
4. How it is built: architecture diagram (Mermaid from design.md), stack table with one-line
   reasons, link to ADRs.
5. Product thinking: persona, pain points → features (table from pain-points.md), what is
   deliberately out and why (from requirements.md), EU directive framing.
6. Quality: test pyramid with counts and runtime, the authorization matrix test, CI jobs,
   coverage; TDD commit cadence (`git log` excerpt).
7. Security and privacy: threat-model summary, OWASP mapping link, residual risks (honest).
8. Performance: p95 numbers, indexes, caching, "designed for 100k" notes (perf.md).
9. The assistant: design in five sentences, eval pass rate, provider neutrality, guardrails.
10. How AI was used to build this: tools (Claude for planning/research, Claude Code for
    implementation), the vault approach, `docs/ai/prompts.md`, and **three places where the
    AI's first proposal was rejected and why** (collect these during the build in prompts.md).
11. Known limitations and what's next (from backlog.md).
12. Licence.

### 5.3 Artefact sweep (≈ 1 h)
- `docs/requirements.md` unchanged since first commit except an "Outcome" footer that says
  what shipped vs planned (honesty beats retrofitting).
- All ADRs have status `Accepted` (or `Superseded`); ADR-010 lists exclusions.
- `docs/ai/prompts.md` complete; `docs/ai/eval-report.md` present; `docs/perf.md`,
  `docs/security-check.md`, `docs/a11y.md`, `docs/api/openapi.json` current.
- Vault: `progress.md` final state = "Shipped v1.0.0"; every file's `updated:` bumped if changed;
  `index.md` lists every file; no broken links (run `tools/docs/check-links.ts`).
- Remove dead code, TODOs without an owner, unused deps (`pnpm dlx knip`).

### 5.4 Video (Pushpendra records; agent prepares) (≈ 1.5 h)
- Follow `docs/demo-script.md` (4–5 min). Record at 1440×900, demo data, reporting currency
  USD, one planned salary change (pick the employee beforehand), one import, three questions
  to the assistant, one viewer-role contrast, 30 s on the code: `git log`, the matrix test, an ADR.
- Upload (YouTube unlisted or Loom); link in README and in the submission email.

### 5.5 Release and submission (≈ 30 min)
- `git tag -a v1.0.0 -m "PayLens v1.0.0 — assessment submission"`; push tags.
- Final CI green on the tag; Vercel production is the tagged commit.
- Submission email (reply to the assessment thread): repo link, live URL, demo credentials
  note (demo buttons, no password), video link, one paragraph on approach and one on what
  you'd do next. Keep it under 150 words.

## Exit checklist

- [ ] Live URL works from a phone and a laptop, cold
- [ ] README complete with screenshots, numbers and honest limitations
- [ ] Tag `v1.0.0` on `main`, CI green, Vercel on that commit
- [ ] Video uploaded and linked
- [ ] Email sent; `progress.md` reads "Shipped"; `docs/ai/prompts.md` closed with a final entry

## After submission (optional, do not start before sending)

Stretch items from `product/backlog.md` on a `post-submission` branch so the submitted tag
stays exactly what was reviewed.
