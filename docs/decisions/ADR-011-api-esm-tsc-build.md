# ADR-011 — Build the API as an ES module with plain `tsc`, not the Nx webpack build

- **Status:** Accepted
- **Date:** 2026-11-14
- **Deciders:** Claude (agent), recorded for Pushpendra's review

## Context
ADR-002 chose NestJS 12, which is published as ESM only. The Nx 24 `@nx/nest` generator still
scaffolds NestJS 11 with a webpack build that emits CommonJS. Nest's dependency injection needs
decorator metadata, which esbuild-style bundlers do not emit. The build must stay explainable
line by line and deploy to Vercel (ADR-008).

## Options considered
1. Keep webpack (CommonJS bundle that `require`s ESM Nest packages) — works on Node 24 via
   `require(esm)`, but mixes module systems and is not what anyone else runs.
2. esbuild/Vite bundle — fast; no `emitDecoratorMetadata`, so constructor injection breaks.
3. `"type": "module"` + `tsc --build` — exactly what `nest new` generates in v12; one tool,
   emits decorator metadata, output is plain per-file JS.

## Decision
Option 3. `apps/api` is an ES module; relative imports end in `.js`; `nx build api` runs
`tsc --build tsconfig.app.json`; `nx serve api` runs `tsc --watch` alongside `node --watch`.
Workspace libs are consumed through their package `exports` (built `dist/` at runtime).

## Consequences
- Positive: matches NestJS's own v12 template; no bundler config to defend; tests (Vitest on
  Vite 8) and build agree on decorator metadata.
- Negative: `.js` suffixes on TypeScript imports look odd at first; libs must be built before
  the API runs (Nx `dependsOn: ^build` handles it).
- Follow-ups: confirm Vercel's NestJS preset accepts this layout in task 0.6; if not, record
  the adapter (ADR-008 fallback) here.

## Links
ADR-002 · ADR-008 · docs/vault/design/architecture.md · commit c729291
