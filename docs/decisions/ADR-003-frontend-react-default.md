# ADR-003 — Build the web app in React (Vite + shadcn/ui); Angular only if the recruiter allows it

- **Status:** Accepted (default) — final confirmation pending recruiter reply (D-1 in progress.md)
- **Date:** 2026-11-14
- **Deciders:** Pushpendra (with Claude)

## Context
The assessment brief says "UI: ReactJS or NextJS. AngularJS for Java". The JD is a
TypeScript/AI role (React is a nice-to-have, "or another modern frontend framework").
Pushpendra is an Angular expert with React fundamentals but no production React. The UI
must be "amazing and easy to use" and will be built mostly by Claude Code, then defended
by Pushpendra. He has asked the recruiter whether Angular is acceptable.

## Options considered
1. **React 19 + Vite + shadcn/ui + Tailwind v4** — complies with the brief as written; the
   stack most modern SaaS UIs use and the one agents generate most reliably; components
   live in the repo as plain React (readable). Learning curve for the candidate.
2. Next.js — also compliant; adds a second server runtime and unfamiliar concepts (RSC,
   caching) that are irrelevant with a separate NestJS API.
3. Angular 22 + PrimeNG — Pushpendra's strength; fastest to defend; **non-compliant unless
   the recruiter waives the constraint**.
4. React + MUI — compliant and Material-familiar; harder to make distinctive; DataGrid limits.

## Decision
Default to option 1. If the recruiter explicitly allows Angular for this role, switch to
option 3 before Phase 2.3 and mark this ADR "Superseded by ADR-011". Everything outside
`apps/web` is unaffected. Charts use ECharts in both variants.

## Consequences
- Positive: no risk of failing the brief's constraint; distinctive UI achievable with the
  design tokens; the candidate learns React on a real codebase with a cheat sheet
  (`docs/learning/react-for-angular-engineers.md`).
- Negative: interview exposure on React internals. Mitigation: conventional patterns only
  (hooks, TanStack Query, React Router); agent explains any file on request.
- Follow-ups: record the recruiter's answer and the date in progress.md; keep the Angular
  variant notes in design/frontend.md until the decision is final.

## Links
docs/vault/design/frontend.md · docs/vault/design/ui.md · F-06, F-07, F-09
