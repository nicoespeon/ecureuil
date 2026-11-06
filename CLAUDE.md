# Écureuil

Offline-first grocery list for one household, with a catalogue of `Article`s, each with a rayon per magasin so the list walks the store in order. Codename _Écureuil_ (squirrel). The brief and the task list live in the Notion project page "Créer une app pour faire les courses"; the decisions live here, in [`GLOSSARY.md`](GLOSSARY.md) and in [`docs/adr`](docs/adr).

## Repo layout

pnpm workspace + Turborepo (`apps/*`, `packages/*`), Biome, lefthook.

- `apps/web` — Vite + React + TypeScript strict + Tailwind PWA. Mobile-first, also used on the Mac for configuration. React components never see Effect; the adapters of the ports (IndexedDB, HTTP) and the sync loop may use it, outside components.
- `apps/api` — Hono on Cloudflare Workers, D1 for the journal (`wrangler.jsonc`). `/health` for smoke checks.
- `packages/domain` — `@ecureuil/domain`: events, reducer, and the `EventStore` / `SyncTransport` / `Clock` ports as Effect services. 100 % pure, no I/O.
- `packages/wire` — `@ecureuil/wire`: the Effect Schema contract shared by web and API.

Both packages are source-only (consumers bundle `src/index.ts`, no build step).

## Commands (from the repo root)

```sh
pnpm install
pnpm check                 # biome (0 warning) + suppression scan + node tests + typecheck + vitest, the one gate (pre-commit and CI)
pnpm build                 # builds apps/web (CI runs it after check)
pnpm check:fix             # biome auto-fix
pnpm --filter web dev      # http://localhost:5173
pnpm qa:capture            # screenshots + video of the seed in qa-output/ (QA_OUT=before for the before)
pnpm --filter api dev      # http://localhost:8787/health (wrangler, local D1)
pnpm --filter api db:migrate   # apply apps/api/migrations to the local D1 (--remote for production)
pnpm --filter api liens        # create (or replace) the two secret links (--remote for production)
```

The API (`/journal` push and pull, curl examples) is documented in [`apps/api/README.md`](apps/api/README.md).

`.claude/launch.json` declares both dev servers (`web`, `api`).

## Toolchain gotchas

Node and pnpm versions live in `.tool-versions` (asdf) and `packageManager`, nowhere else; Renovate bumps them.

- **asdf is not initialized in non-interactive shells.** Prefix commands with:

  ```sh
  export PATH="$HOME/.asdf/shims:$PATH"
  ```

  The shims read `.tool-versions` from the current directory. If a command answers `No version is set`, the version is not installed yet: run `asdf install nodejs` then `asdf install pnpm` (in that order: the pnpm plugin needs a working `npm`).
- `git commit` runs `pnpm check` through lefthook, so the same `PATH` is needed before committing.
- **`git push` must be its own command** (network/SSH; the sandbox denies it when bundled). Prefer `git -C <repo>` over a bundled `cd … || exit 1`.
- pnpm 12 refuses to install when a dependency's build script is not allowed: add it to `allowBuilds` in `pnpm-workspace.yaml`.
- pnpm 12 also refuses packages published less than a day ago, and the local cache hides it: a same-day version passes `pnpm add -E` locally but breaks `pnpm install --frozen-lockfile` in CI until the next day. Don't bypass it with `minimumReleaseAgeExclude`; wait or take the previous version (details in [`docs/research/ci-cd.md`](docs/research/ci-cd.md)).
- Effect is 4.1.2, not 3.x: check the API in [`docs/research/effect-4-schema.md`](docs/research/effect-4-schema.md) or `node_modules/effect` before writing Effect code from memory.
- Biome also formats Markdown (e.g. a blank line before a fenced block inside a list): run `pnpm check:fix` after editing docs.
- Run long commands in the foreground, one per call.

## Harness

Strict Biome (`biome.json`, plus the GritQL rules in `biome-plugins/`) and two hooks in `.claude/settings.json` keep the repo at zero warnings:

- After each `Edit` / `Write`, `.claude/hooks/lint-edit.mjs` lints the file and hands back every finding with its guide. Fix them before moving on: `pnpm check` fails on any warning. It also reports, as advice only, a clone this branch wrote.
- Before each `Edit` / `Write`, `.claude/hooks/no-inline-suppression.mjs` denies an edit that adds `biome-ignore`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck` or `eslint-disable`; `pnpm check` runs the same scan on every file.

A finding is fixed in the code, guided by `.claude/hooks/guides/<smell>.md` (or the Biome doc it links). When a rule is wrong, change it in `biome.json` in a dedicated PR.

## Language

The ubiquitous language is French, deliberately hybrid with English technical vocabulary:

- Domain nouns are French identifiers, exactly as in [`GLOSSARY.md`](GLOSSARY.md): `Foyer`, `Magasin`, `Rayon`, `Article`, `Liste`, `Panier`, `Sortie`, `Achat`, `Demande`. No accents in identifiers (`NonClasse`, `PasVenduIci`).
- Events are a French noun with an English verb: `MagasinCreated`, `ArticleRayonSet`, `SortieFinished`, `DemandeRefused`.
- Roles are domain terms too: `proprietaire` / `invite`. Technical vocabulary stays English: `device`, `fold`, `listForMagasin`, the ports, statuses (`toBuy`, `Pending`), attributes (`name`, `quantity`).
- Code comments in English. ADRs, PR bodies and the glossary in French.
- Test titles (`describe`, `it`, `it.each`, Playwright `test`) in French, keeping domain identifiers and English technical vocabulary as is; the test code and its comments stay English.
- Commit subjects and PR titles follow the conventional commit format; French is fine, especially for domain terms, and PR titles become the squash commit.
- Never introduce or rename a domain term without asking Nicolas, through `/domain-modeling`.

## Conventions

The global standards in `~/.claude/CLAUDE.md` apply (TDD-first, less code, named exports, co-located types, exact dependency versions). Project-specific:

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`…), small. **No `Co-Authored-By`.**
- Effect lives in `packages/domain`, `packages/wire` and the adapters of `apps/web`, never in a React component ([ADR 3](docs/adr/0003-hebergement-cloudflare-effect-confine-au-coeur.md)). React components consume plain state and plain functions.
- Tagged values come from their Effect constructor (`Data.taggedEnum`, `Schema.TaggedUnion` `.cases.X.make`), never a `{ _tag: … }` literal; [`biome-plugins/no-tag-literal.grit`](biome-plugins/no-tag-literal.grit) enforces it in `pnpm check`, tests excepted.
- Dependencies pinned to exact versions (`pnpm add -E`).
- Accessibility is not negotiable; motion honours `prefers-reduced-motion`.
- A comment on a declaration (type, property, function, constant) is JSDoc (`/** … */`); `//` is for a line inside a body.

## Workflow

- New feature or fuzzy task: invoke `/grilling` (mattpocock-skills) before writing any code; settle the design tree with Nicolas first.
- New domain term, changed concept, or any architectural decision: invoke `/domain-modeling` (mattpocock-skills); it challenges terms against `GLOSSARY.md`, asks Nicolas before settling a term, and records ADRs in `docs/adr/`. Never edit `GLOSSARY.md` or add an ADR outside it.
- UI layout or state-machine question: invoke `/prototype` (throwaway, never merged to `main`).
- Fact about a library (Effect, D1, vite-plugin-pwa, Base UI…): invoke `/research`; findings go to `docs/research/<topic>.md` with sources.
- Working a Notion task: own worktree and branch; `/grilling` first if the task is fuzzy; TDD, red before green; small conventional commits; `/code-review` on the branch with confirmed findings fixed BEFORE the PR is opened — never open a PR that has not been through it; QA evidence as described under "Pull requests"; `/pr-ecureuil` writes the title and body and opens the PR.
- Tasks live in Notion (project page https://app.notion.com/p/4053f52c56c18004bbc6e30d10a1a4a3, "All Tasks" database): one session per task, started in a worktree. The task goes Doing at start and Done only once the PR is merged, never when it is opened; archive the session after merge.

### Pull requests

- Continuous integration: every task ends in a PR to `main`; merge = deploy. The PR is the QA gate, not `main`.
- `.github/workflows/ci.yml` runs `pnpm check`, `pnpm build` and the Playwright smoke (`pnpm --filter web smoke`), then deploys `apps/web` to Cloudflare Pages (preview per PR branch, production on `main`) and `apps/api` to Workers on `main` only, after applying the D1 migrations, smoke-tested on `/health`. No API preview: it would share the production D1. Facts and sources: [`docs/research/ci-cd.md`](docs/research/ci-cd.md).
- The PR title becomes the squash commit, so `.github/workflows/pr-title.yml` checks it is `type(scope)?: subject` (≤ 100 characters); test a title locally with `node .github/scripts/check-pr-title.mjs "feat: …"`.
- Renovate runs self-hosted daily (`.github/workflows/renovate.yml`, `renovate.json`): pinned versions, at most 2 new PRs a day, non-major updates grouped and automerged once CI is green, majors left open for Nicolas, lockfile maintenance on Mondays.
- The session that did the work does the QA itself before opening the PR and puts the evidence in the PR body: before/after screenshots for any UI change, a short video (webm) for any interaction change, captured with `pnpm qa:capture`: Playwright over the dev seed on a mobile viewport writes `costco.png`, `maxi.png`, `panier.png`, `terminer.png` and `courses.webm` to `qa-output/after/` (git-ignored). For the before, run `QA_OUT=before pnpm qa:capture` on `main` (e.g. a `git worktree` of it) into `qa-output/before/`. First run on a machine: `pnpm --filter web exec playwright install chromium`. Extend `apps/web/playwright/qa-capture.pw.ts` when the change shows a new state.
- PR title and body: the repo skill [`/pr-ecureuil`](.claude/skills/pr-ecureuil/SKILL.md) (not named `pr-description`: a personal skill hides a project skill of the same name). Review happens per comment on GitHub: address each one as it comes, fix or reply.
- Attach the files with `gh pr create --attach './qa-output/after/panier.png#Alt text'` (also `gh pr edit N --attach`); references like `![alt](./qa-output/after/panier.png)` in the body are rewritten to the uploaded asset. Up to 50 files per command.
- Keep PRs small, one Notion task each; link the Notion task in the body.
