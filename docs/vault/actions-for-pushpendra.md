---
title: Actions for Pushpendra — everything waiting on you, in one place
updated: 2026-11-16
status: active
---

# Actions for Pushpendra

Everything the build is waiting on you for, in the order to do it. Each item says why, how
long, the exact steps, and what to send back. Claude keeps this file current: done items are
struck through, never deleted. Total: about 45 minutes, plus the two replies.

## 1. Reply: CSP for runtime styles (D-8) — 1 minute, decides now

**Why:** on the live site the Content-Security-Policy blocks three `<style>` blocks that the
toast (sonner) and dialog (Radix) libraries add at runtime. Effect: toasts such as "Salary
change recorded…" appear unstyled. Changing a security control is your call (CLAUDE.md).

**Choose one and reply with its number:**
1. Allow those three exact blocks by their SHA-256 hashes (recommended): the policy stays
   strict; Claude updates the hashes when those libraries change (a CI check can catch it).
2. Allow inline styles in general (`style-src 'unsafe-inline'`): simpler, slightly weaker.
   Scripts stay locked down either way.

Rejecting Claude's first proposal (2) also gives the README its third "AI proposal the human
rejected" (it needs three; two are recorded in `docs/ai/prompts.md`).

## 2. Reply: model for "Ask about pay" (D-3) — 2 minutes, due 2026-11-17

**Why:** Phase 4's assistant needs an LLM. The code is provider-neutral; only the demo key
differs.

**Choose one and reply:**
- **Gemini Flash-Lite (free, default):** create a key at https://aistudio.google.com/apikey and
  add it in Vercel → `paylens-api` → Settings → Environment Variables as
  `GOOGLE_GENERATIVE_AI_API_KEY` (Production, Sensitive).
- **Claude Haiku (about $5 of credit):** create a key at https://console.anthropic.com/ (needs a
  payment method — this costs money, so only you can do it) and add it as `ANTHROPIC_API_KEY`.

Never paste a key into chat or a file; Vercel only.

## 3. Check Google sign-in works on the live site once — 15 minutes

**Why:** sign-in is built and tested with a fake Google, but has never been used with a real
Google account. The Phase 2 exit checklist wants it seen once on the deployed app.

**Steps:**
1. Google Cloud Console → APIs & Services → OAuth consent screen: user type **External**,
   scopes `openid`, `email`, `profile` only, publishing status **In production** (click
   *Publish app*). While it says "Testing", only listed test users can sign in.
2. Same console → Credentials → your OAuth client → *Authorized JavaScript origins* contains
   `https://paylens-web-black.vercel.app` (and `http://localhost:4200`, `http://localhost`).
   *Authorized redirect URIs* stays empty.
3. Vercel → `paylens-api` → Settings → Environment Variables (Production):
   - add `ADMIN_EMAILS` = your Gmail address (you become admin on first sign-in);
   - edit `AUTH_ENABLED` from `false` to `true`.
4. Vercel → `paylens-api` → Deployments → the latest → ⋯ → **Redeploy** (environment changes
   only apply to a new deployment). The web project needs nothing: it asks the API.
5. Open https://paylens-web-black.vercel.app → "Sign in to PayLens" → *Sign in with Google*.
   Expected: the app opens with your name top right and "Sign out". Try *Sign out*.
6. Put it back for reviewers: `AUTH_ENABLED` = `false`, then **Redeploy** again. Check the site
   opens without sign-in.

**Reply with:** "sign-in works", or the exact message the page showed.

## 4. Keyboard-only run-through — 15 minutes

**Why:** Phase 2 exit checklist ("keyboard-only run-through done once by Pushpendra"); tests
cover structure (axe), but only a person can say whether it feels right.

**Steps, without touching the mouse** (live site, sign-in off):
1. `Tab` from the address bar: you should see a teal focus ring on every stop.
2. `/` focuses the top search; type a name, `Enter` → the directory, filtered.
3. `Tab` to a column header, `Enter` → it sorts (and says so to screen readers).
4. `Tab` to a person's name, `Enter` → their profile.
5. `Tab` to *Change salary*, `Enter`; fill the form; `Esc` closes; open it again and save.
6. `Ctrl+K` → type "pay" → arrows + `Enter` → Pay bands.
7. "Viewing as" → Viewer with the keyboard; the money columns disappear.

**Reply with:** anything that was awkward, missing or surprising (or "fine").

## 5. Optional — Vercel MCP team access — 2 minutes

**Why:** lets Claude inspect deployments through MCP instead of the CLI. Not blocking.
**Steps:** in Claude Code run `/mcp` → `vercel` → authorize, choosing the
`virtualsinghs-projects` team when asked.

## Done

- ~~D-1 React~~ · ~~D-2 gender~~ · ~~D-4 public repo~~ · ~~D-5 main with CI~~ · ~~D-6 Google
  OAuth client~~ · ~~D-7 sign-in parked~~ (built behind the flag instead, ADR-014).
