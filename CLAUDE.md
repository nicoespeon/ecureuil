# Écureuil

Offline-first grocery list for one household, with a catalogue of items filed under a rayon per store so the list walks the store in order. Codename _Écureuil_ (squirrel). The brief and the task list live in the Notion project page "Créer une app pour faire les courses"; the decisions live here, in [`GLOSSARY.md`](GLOSSARY.md) and in [`docs/adr`](docs/adr).

## Repo layout

pnpm workspace + Turborepo (`apps/*`, `packages/*`), Biome, lefthook.

- `apps/web` — Vite + React + TypeScript strict + Tailwind PWA. Mobile-first, also used on the Mac for configuration. Never imports Effect.
- `apps/api` — Hono on Cloudflare Workers, D1 for the journal (`wrangler.jsonc`). `/health` for smoke checks.
- `packages/domain` — `@ecureuil/domain`: events, reducer, and the `EventStore` / `SyncTransport` / `Clock` ports as Effect services. 100 % pure, no I/O.
- `packages/wire` — `@ecureuil/wire`: the Effect Schema contract shared by web and API.

Both packages are source-only (consumers bundle `src/index.ts`, no build step).

## Commands (from the repo root)

```sh
pnpm install
pnpm check                 # biome + typecheck + vitest, the one gate (also runs on pre-commit)
pnpm check:fix             # biome auto-fix
pnpm --filter web dev      # http://localhost:5173
pnpm --filter api dev      # http://localhost:8787/health (wrangler, local D1)
```

`.claude/launch.json` declares both dev servers (`web`, `api`).

## Toolchain gotchas

Versions pinned in `.tool-versions` (asdf): `nodejs 24.21.0`, `pnpm 12.16.1`.

- **asdf is not initialized in non-interactive shells.** Prefix commands with:

  ```sh
  export PATH="$HOME/.asdf/shims:$PATH"
  export ASDF_NODEJS_VERSION=24.21.0 ASDF_PNPM_VERSION=12.16.1
  ```
- `git commit` runs `pnpm check` through lefthook, so the same env must be exported before committing.
- **`git push` must be its own command** (network/SSH; the sandbox denies it when bundled). Prefer `git -C <repo>` over a bundled `cd … || exit 1`.
- pnpm 12 refuses to install when a dependency's build script is not allowed: add it to `allowBuilds` in `pnpm-workspace.yaml`.
- Run long commands in the foreground, one per call.

## Conventions

The global standards in `~/.claude/CLAUDE.md` apply (TDD-first, less code, named exports, co-located types, exact dependency versions). Project-specific:

- All code, comments, identifiers and commit messages in **English**. The UI and the glossary are in French.
- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`…), small. **No `Co-Authored-By`.**
- Effect stays in `packages/domain` and `packages/wire`. React components consume plain state and plain functions.
- Dependencies pinned to exact versions (`pnpm add -E`).
- Accessibility is not negotiable; motion honours `prefers-reduced-motion`.

## Workflow

- New feature or fuzzy task: invoke `/grilling` (mattpocock-skills) before writing any code; settle the design tree with Nicolas first.
- New domain term, changed concept, or any architectural decision: invoke `/domain-modeling` (mattpocock-skills); it challenges terms against `GLOSSARY.md` and records ADRs in `docs/adr/`. Never edit `GLOSSARY.md` or add an ADR outside it.
- UI layout or state-machine question: invoke `/prototype` (throwaway, never merged to `main`).
- Fact about a library (Effect, D1, vite-plugin-pwa, Base UI…): invoke `/research`; findings go to `docs/research/<topic>.md` with sources.
- Working a Notion task: own worktree and branch; `/grilling` first if the task is fuzzy; TDD, red before green; small conventional commits; `/code-review` on the branch with confirmed findings fixed BEFORE the PR is opened — never open a PR that has not been through it; QA evidence as described under "Pull requests"; `/pr-description` for the body; open the PR.
- Mark the Notion task Doing at start and Done once the PR is open; archive the session after merge.
- Tasks live in Notion (project page https://app.notion.com/p/4053f52c56c18004bbc6e30d10a1a4a3, "All Tasks" database): set the task to Doing when starting and Done when finished; one session per task, started in a worktree.

### Pull requests

- Continuous integration: every task ends in a PR to `main`; merge = deploy (Cloudflare preview URL per PR, `main` deploys to production once task 12 is done). The PR is the QA gate, not `main`.
- The session that did the work does the QA itself before opening the PR and puts the evidence in the PR body: before/after screenshots for any UI change, a short video (webm) for any interaction change, captured with `pnpm qa:capture` (Playwright over the dev seed; added by task 12 — until then, Playwright or the built-in browser by hand).
- PR body, written for a developer/architect who wants to see what changes in the code's structure, not the code itself: short paragraphs that go to the point, formatting where it helps, what changes and why, never what was not done; an architecture diagram (Mermaid) only when it serves the point; every reference (ADR, glossary term, Notion task) is a link to its source on the branch; run `/stop-slop` on the body before posting. Review happens per comment on GitHub: address each one as it comes, fix or reply.
- Attach the files with `gh pr create --attach './after.png#Alt text'` (also `gh pr edit N --attach`); references like `![alt](./after.png)` in the body are rewritten to the uploaded asset. Up to 50 files per command.
- Keep PRs small, one Notion task each; link the Notion task in the body.
