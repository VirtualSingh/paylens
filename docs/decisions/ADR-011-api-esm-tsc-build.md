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
- ~~Follow-up: confirm Vercel's NestJS preset accepts this layout~~ — it does not (below).

## Addendum 2026-11-15 — deploying to Vercel
Vercel's NestJS preset re-compiles `src/main.ts` with its own TypeScript service. Four deploys
failed on it (inherited `composite` → silent "Emit skipped"; then helmet typed as CommonJS),
in ways a Windows replica could not reproduce. Decision (ADR-008's fallback): the Vercel
project uses the "Other" preset and `apps/api/api/index.js`, a plain-JS Function that serves
the app our `tsc` build emitted to `dist/` (via `createApp()`); `vercel-build` runs
`nx run api:build` first. `main.ts` stays the entrypoint for a long-running server.
Production therefore runs exactly the JavaScript that CI builds and tests.

## Links
ADR-002 · ADR-008 · docs/vault/design/architecture.md · commits c729291, 212fba8…7620a30
