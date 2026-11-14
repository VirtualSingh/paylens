---
title: Phase 0 — Foundation (repo, vault, workspace, CI, walking skeleton deployed)
updated: 2026-11-14
status: active
window: 2026-11-14 night → 2026-11-15 noon
---

# Phase 0 — Foundation

**Goal:** a reviewer opening the repo sees the requirements doc first, then a clean
workspace with CI, and a deployed hello-world that already proves the topology works.
**Entry:** this vault sits in a folder opened in VS Code with Claude Code; Pushpendra has
GitHub, Vercel and Neon accounts (account sign-ups are the only steps the agent cannot do).
Everything else — tooling, repo creation, scaffolding, deployment projects — the agent does.

## Tasks (in order)

### 0.0 Environment bootstrap — the agent sets up the machine (≈ 15 min)
- Detect OS and shell. Check `node -v` ≥ 22; if missing or older, install via `fnm` or `nvm`
  (user-level, no admin). Anything that needs admin rights (Docker Desktop, system Node) →
  tell Pushpendra what to install and continue; Docker is not needed until Phase 1.2.
- `corepack enable && corepack prepare pnpm@latest --activate`; verify `pnpm -v`
  (fallback `npm i -g pnpm`). Pin with the `packageManager` field once `package.json` exists.
- Git: if `user.name`/`user.email` are unset, set them from the owner line in `CLAUDE.md`.
  `git init -b main` if the folder is not a repository.
- GitHub: `gh auth status`; if not logged in, run `gh auth login` and ask Pushpendra to complete
  the browser step. Then `gh repo create <owner>/paylens --public --source=. --remote=origin`
  (visibility per D-4 in progress.md). If `gh` is unavailable, use the GitHub MCP, or ask for
  the empty repo URL and `git remote add origin`.
- Check `docker --version`; if absent, add a line under Blockers in `progress.md` with the
  install link — do not stop (needed from Phase 1.2 only).
- **Install the tooling yourself** (user-level, no admin): `pnpm add -g vercel neonctl`;
  `gh` via the OS package manager (`brew install gh` / `winget install GitHub.cli`; on Linux
  `apt` needs sudo → ask). Verify each with `--version`.
- **Add the MCP servers yourself**, at project scope so `.mcp.json` is committed and reviewers
  can see the tooling (tokens are never stored there):
  `claude mcp add --scope project --transport http vercel https://mcp.vercel.com` ·
  `claude mcp add --scope project --transport http neon https://mcp.neon.tech/mcp` ·
  `claude mcp add --scope project nx-mcp -- npx -y nx-mcp@latest` ·
  (Angular variant only) `claude mcp add --scope project angular-cli -- npx -y @angular/cli mcp`.
  GitHub operations go through `gh`; the GitHub MCP is optional. Then tell Pushpendra, in one
  message: "Restart Claude Code (new MCP servers load at startup), complete the browser
  login when the Vercel and Neon servers ask for it, then say *Resume PayLens*." Stop there.
- On resume: confirm the servers respond (list Vercel teams/projects, list Neon projects);
  if a server is unavailable, 0.6 falls back to the CLIs (`vercel`, `neonctl`), and only if
  those also fail, to asking Pushpendra for the dashboard clicks with exact instructions.
- Record OS, Node, pnpm, git, Docker, CLI and MCP versions under "Useful facts" in `progress.md`.

### 0.1 Repo and documents first (≈ 30 min)
- Commit this vault (`CLAUDE.md`, `docs/`) and push: `docs: add product vault, requirements and plan`.
- Commit `docs/requirements.md` as its **own** commit *before any code*: `docs: one-page requirements document`.
- Add `LICENSE` (MIT), `.gitignore` (node, env, nx, coverage, playwright), `.editorconfig`, `.nvmrc` (22).
- Decide branch strategy (default: commit to `main` with CI; see deployment.md) and record in `progress.md`.

### 0.2 Nx workspace (≈ 45 min)
- `pnpm dlx create-nx-workspace@latest paylens --preset=ts --pm=pnpm` (integrated, no Nx Cloud).
- Generate `apps/api` with `@nx/nest` (Nest 12, Vitest unit runner), `apps/web` with
  `@nx/react` (Vite, Vitest, no router preset — we add React Router ourselves), `apps/web-e2e`
  (Playwright), `libs/domain` and `libs/shared` with `@nx/js` (ESM, Vitest).
  *If ADR-003 switches to Angular: generate `apps/web` with `@nx/angular` instead.*
- TypeScript `strict` + `noUncheckedIndexedAccess` in the base tsconfig; path aliases `@paylens/domain`, `@paylens/shared`.
- ESLint flat config: typescript-eslint strict, `eslint-plugin-security`, Nx module boundaries
  (`web→shared`, `api→shared,domain`, `domain→∅`). Prettier. Husky + lint-staged + commitlint
  (conventional). Commit: `chore: scaffold Nx workspace with api, web, domain, shared`.

### 0.3 Test harness skeletons — TDD from the first line (≈ 45 min)
- `libs/domain`: first test `Money.add` (minor units, same currency) → implement → refactor. Commits per cycle.
- `libs/shared`: first Zod schema `PaginationQuerySchema` with a test for bounds (page ≥ 1, pageSize ≤ 100).
- `apps/api`: `GET /api/v1/health` and `/health/ready` test with supertest → implement with
  `helmet`, request-id middleware, problem+json filter skeleton, Swagger at `/api/docs`.
- `apps/web`: `App` renders the shell with nav items (Testing Library test) → implement shell
  with tokens from ui.md (`styles/tokens.css`), Tailwind v4, fonts self-hosted, shadcn init
  (Button, Sheet, Dialog, Tooltip, Toast, Command, Table, Skeleton).
- PGlite harness: `apps/api/src/db/testing/pglite.ts` creating a DB, loading extensions
  (`btree_gist`, `pg_trgm`, `citext`) and running migrations — verify extension support **now**
  (risk register). Test: `SELECT 1` + an exclusion constraint on a scratch table works.

### 0.4 Local infrastructure (≈ 20 min)
- `docker-compose.yml` with Postgres 17 + init script enabling extensions; `.env.example` with
  every variable from deployment.md; `pnpm dev` (api + web concurrently); Vite proxy `/api`.
- Drizzle config (`drizzle.config.ts`), `db:generate`, `db:migrate`, `db:seed` scripts (seed is a stub that exits 0 with "not implemented" for now).

### 0.5 CI (≈ 30 min)
- `.github/workflows/ci.yml`: jobs lint-typecheck, test (coverage artefact), build, security
  (`pnpm audit --prod --audit-level=high`, gitleaks, osv-scanner). Pin actions to SHAs. Nx cache.
- Branch protection: require CI (even on `main`, pushes still run it; failing pushes get fixed next commit).
- Commit: `ci: lint, test, build and security scans on every push`.

### 0.6 Walking skeleton deployed (≈ 60 min, do not skip)
- Neon: create project + `main` branch, two roles, enable extensions; store direct and pooled URLs.
- Vercel: create `paylens-api` (root `apps/api`) and `paylens-web` (root `apps/web`); env vars;
  `vercel.json` rewrite in web; deploy. Verify `https://<web>/api/v1/health/ready` returns
  DB ok through the rewrite.
- README skeleton with live URL placeholder and "how to run" (5-minute path).
- Commit: `chore(deploy): vercel projects, rewrites and neon connection`.
- Record both URLs and the Vercel/Neon project ids in `progress.md` (not secrets).

## Exit checklist (Pushpendra reviews, ~15 min)

- [ ] `git log` starts with docs commits, then scaffold, then test-first cycles
- [ ] `pnpm install && pnpm test` passes in < 20 s with zero network
- [ ] CI green on GitHub; badges in README
- [ ] Deployed web shell loads; `/api/v1/health/ready` is green through the rewrite
- [ ] `progress.md` updated; decisions recorded (branch strategy, framework default)

## Notes for the agent

- Use the generators (`nx g`) rather than hand-writing config; then trim what we do not use.
- Keep `main.ts` conventional (`bootstrap()` → `app.listen()`); Vercel relies on it.
- If PGlite cannot load `btree_gist`, stop and write the fallback decision (Docker Postgres
  for repository tests via `testcontainers`) into ADR-007 before continuing.
