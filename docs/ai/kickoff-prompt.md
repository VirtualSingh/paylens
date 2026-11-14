# Kickoff prompt for Claude Code (paste as the first message of the first session)

Before pasting, you need only this: a folder containing this vault (`CLAUDE.md` at the top,
`docs/` next to it) opened in VS Code with the Claude Code panel; the Opus model at the highest
effort setting your Claude Code offers; auto-accept edits on; and accounts on GitHub, Vercel
and Neon (sign-ups are the one thing the agent cannot do for you). Node/pnpm/git setup, the
CLIs, the MCP servers, the GitHub repository and the Vercel/Neon projects are all created by
the agent in Phase 0 (tasks 0.0 and 0.6). Expect exactly two interruptions in the first
session: a browser login (GitHub, then Vercel/Neon when their MCP servers first connect) and
one restart of Claude Code after it adds the MCP servers.

---

You are building PayLens, an employee salary management web app, as a take-home assessment
and a portfolio product. Everything you need to know is in this repository's vault.

Do this, in order, and tell me in one line when each step is done:

1. Read `CLAUDE.md` completely. It contains non-negotiable rules (TDD cadence and commit
   conventions, security rules, the vault rules, when to ask me).
2. Read `docs/vault/progress.md`, then `docs/vault/plan.md`, then
   `docs/vault/plan/phase-0-foundation.md`. Skim `docs/vault/index.md` so you know what
   exists; open other design files only when a task needs them.
3. Check the "Decisions pending" table in `progress.md`. For any decision whose due date has
   passed without my answer, take the default, record it under "Decisions taken", and move on.
4. Execute Phase 0 task by task, starting with 0.0: set up this machine yourself — Node,
   pnpm, git identity, the `vercel`/`neonctl`/`gh` CLIs, the MCP servers, the GitHub repo.
   Ask me only when my hands are required: a browser login, an admin-level install, or the
   restart after you add MCP servers. Then work test-first. Commit at the end of every red-green-refactor cycle with conventional messages.
   Never leave the tree red. Update `progress.md` and the dated log when you finish a task or stop.
5. Stop and ask me only when a decision costs money, cannot be undone, changes the stack or
   scope, or when two defensible options differ in what a reviewer would see. Ask one question
   at a time and propose a default. Otherwise decide, record the reasoning, continue.
6. At the end of the session: `progress.md` current, log entry written, `docs/ai/prompts.md`
   appended with anything worth keeping (including any proposal of yours that I rejected and
   why — the README needs three of those), CI green, working tree clean.

Constraints to keep in mind the whole time: the reviewer is a software-craftsmanship shop
that reads commit history for TDD discipline; the code will be defended line by line in an
interview by me, an Angular engineer learning React — prefer conventional patterns and
explain anything unusual in a comment or in the vault; the UI must follow
`docs/vault/design/ui.md` exactly — new ideas go to `docs/vault/product/backlog.md`.

Start with Phase 0, task 0.0.

---

## Prompts for later sessions (short forms)

- **Resume:** "Resume PayLens. Follow the start-of-session ritual in CLAUDE.md and continue with the next step in progress.md."
- **Review notes:** "I added review notes to progress.md. Address them first, then continue."
- **Switch framework (only if recruiter allows Angular):** "The recruiter confirmed Angular is
  acceptable. Apply ADR-003's switch: write ADR-011 superseding ADR-003, update
  design/frontend.md and design.md, regenerate apps/web with @nx/angular, and continue Phase 2.3 with the Angular variant."
- **Explain for interview:** "Explain `<file>` to me as if I will be asked about it in an
  interview: what it does, why it is designed this way, what the alternatives were, and the
  one question a sceptical reviewer would ask."
- **Cut scope:** "We are behind. Apply the cut order in plan.md starting from `<F-id>`; update
  features.md, requirements.md Outcome footer, and progress.md."
- **Ship:** "Run Phase 5. Do not add features. Verify, document, package, and stop before the submission email so I can send it."
