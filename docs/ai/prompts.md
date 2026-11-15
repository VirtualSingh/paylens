# AI usage log — prompts, decisions and overrides

This file is an assessment artefact ("prompts or instructions used with AI tools"). Keep
entries short and honest. Three kinds of entry matter most to a reviewer: the prompt that
shaped a decision, the place where the AI was wrong and was corrected, and the place where
the human chose against the AI's recommendation.

Format: date · tool · what was asked · what came back · what we did with it.

## 2026-11-14 · Claude (chat, planning) · Pushpendra

1. **Assessment brief pasted.** Asked for a plan. Claude recommended a Next.js full-stack
   monolith on the assumption of a React role. **Overridden:** Pushpendra preferred
   Angular + NestJS + Postgres for defensibility and learning; asked for a stack comparison and
   tool research under three constraints (free, official MCP server, agent-operable CLI).
2. **Research request.** Claude verified: Vercel official MCP and zero-config NestJS; Neon free
   plan behaviour and MCP; Supabase pause-after-7-days (rejected for the demo); Render free
   sleep and MCP limits (rejected); Railway free plan ($1/mo credit, rejected); Cloud Run MCP
   (needs billing; stretch); Angular CLI MCP and Nx MCP (official). Angular + NestJS recommended at that point.
3. **JD pasted (Incubyte, Software Craftsperson — TypeScript/AI).** Claude reversed the UI
   recommendation: the brief allows Angular only for Java roles → React (Vite) default, NestJS
   kept; added the Mastra-based assistant with evals as the on-JD differentiator; flagged
   Incubyte's TDD-in-commit-history evaluation lens. Pushpendra asked the recruiter whether
   Angular is acceptable (pending).
4. **Vault request.** Pushpendra asked for product.md / design.md / progress.md as a linked
   "second brain" for Claude Code (small files, split-and-link rule), deep market and pain-point
   research, security "no vulnerabilities" (Claude reframed as threat model + OWASP mapping +
   verification, since no software has zero vulnerabilities), amazing UI, 5-day plan.
   Result: this vault (CLAUDE.md, docs/vault/**, docs/decisions/ADR-001…010, requirements.md,
   kickoff prompt, demo script, React cheat sheet).
5. **Claude's own change of mind, recorded:** first suggested MUI for React (Material
   familiarity); switched to shadcn/ui + Tailwind once "amazing UI, built by the agent" became
   the priority and because the components live in the repo as readable React. MUI remains an
   acceptable alternative in ADR-003.

## Build sessions (Claude Code) — append below

Template:
```
## YYYY-MM-DD · Claude Code (Opus) · Phase X · tasks a.b–c.d
- Prompt(s) used: …
- Notable proposal rejected / corrected by Pushpendra: … (why)
- Notable proposal rejected by the agent itself (and why): …
- Commits: <range>
```

## 2026-11-14/15 · Claude Code (Opus) · Phase 0 · tasks 0.0–0.5
- Prompt used: the kickoff prompt in `docs/ai/kickoff-prompt.md`, pasted as-is; later
  "continue" and "record the current progress and stop … we'll start again in a few hours".
- **Rejected by Pushpendra:** the agent appended `Co-Authored-By: Claude …` to every commit
  (its default attribution). Pushpendra asked for no trailer — the history is his artefact.
  Kept on the first ~45 commits because removing it needs a history rewrite (CLAUDE.md forbids).
- Rejected by the agent itself: the Nx Nest generator's NestJS 11 + webpack/CommonJS build →
  NestJS 12 ESM with plain tsc (ADR-011); `vitest-axe` (unmaintained) → axe-core directly;
  shadcn `nova` preset defaults (Geist font, grey and dark palettes, sample Button) → ui.md tokens.
- Plan deviations the agent took and recorded: MCP restart moved from 0.0 to 0.6; shadcn
  primitives added on first use instead of eight up front; Node 24 instead of 22.
- Commits: e3e0353 … 176bf53 (+ this wrap-up).

## 2026-11-15 · Claude Code (Opus) · Phase 0 · CI fix and task 0.6 (deploy)
- Prompts used: "I have installed docker … go with react ecosystem, start by checking if all
  the MCP servers are up"; "check for actions now"; "all the mcp servers and tools are up now,
  let's start working".
- Decided by Pushpendra: D-1 closed as React (the recruiter is not expected to reply).
- Rejected by the agent itself: Vercel's zero-config NestJS preset. After four failed deploys
  (diagnosed by reading @vercel/node's published source) the agent stopped adapting the code
  to Vercel's compiler, reverted the three workarounds, and deployed a plain-JS function over
  the project's own tsc build (ADR-011 addendum) — production runs what CI tested.
- Rejected by the agent itself: muting OSV-Scanner or scanning production deps only; chose
  fix → pin → accept-with-expiry with written reasons (ADR-012).
- README still needs: human rejections of AI proposals — one so far (the attribution trailer).
- Commits: 0040267 … f61cd4f (+ this wrap-up).
