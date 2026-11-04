# Écureuil

Offline-first grocery list for one household, with a catalogue of items with a rayon per magasin so the list walks the store in order. Codename _Écureuil_ (squirrel). The brief and the task list live in the Notion project page "Créer une app pour faire les courses"; the decisions live here, in [`GLOSSARY.md`](GLOSSARY.md) and in [`docs/adr`](docs/adr).

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

## Language

The ubiquitous language is French, deliberately hybrid with English technical vocabulary:

- Domain nouns are French identifiers, exactly as in [`GLOSSARY.md`](GLOSSARY.md): `Foyer`, `Magasin`, `Rayon`, `Item`, `Liste`, `Panier`, `Sortie`, `Achat`, `Demande`. No accents in identifiers (`NonClasse`, `PasVenduIci`).
- Events are a French noun with an English verb: `MagasinCreated`, `ItemRayonSet`, `SortieFinished`, `DemandeRefused`.
- Technical vocabulary stays English: roles `owner` / `guest`, `device`, `fold`, `listForMagasin`, the ports, statuses (`toBuy`, `Pending`), attributes (`name`, `quantity`).
- Code comments and commit messages in English. ADRs, PR bodies and the glossary in French (ADRs 1 to 3 predate this rule and stay English for now).
- Never introduce or rename a domain term without asking Nicolas, through `/domain-modeling`.

## Conventions

The global standards in `~/.claude/CLAUDE.md` apply (TDD-first, less code, named exports, co-located types, exact dependency versions). Project-specific:

- Conventional commits (`feat:`, `fix:`, `chore:`, `docs:`…), small. **No `Co-Authored-By`.**
- Effect stays in `packages/domain` and `packages/wire`. React components consume plain state and plain functions.
- Dependencies pinned to exact versions (`pnpm add -E`).
- Accessibility is not negotiable; motion honours `prefers-reduced-motion`.
- A comment on a declaration (type, property, function, constant) is JSDoc (`/** … */`); `//` is for a line inside a body.

## Workflow

- New feature or fuzzy task: invoke `/grilling` (mattpocock-skills) before writing any code; settle the design tree with Nicolas first.
- New domain term, changed concept, or any architectural decision: invoke `/domain-modeling` (mattpocock-skills); it challenges terms against `GLOSSARY.md`, asks Nicolas before settling a term, and records ADRs in `docs/adr/`. Never edit `GLOSSARY.md` or add an ADR outside it.
- UI layout or state-machine question: invoke `/prototype` (throwaway, never merged to `main`).
- Fact about a library (Effect, D1, vite-plugin-pwa, Base UI…): invoke `/research`; findings go to `docs/research/<topic>.md` with sources.
- Implementation: TDD per `~/.claude/CLAUDE.md` (`/tdd` or `/test-driven-development`), then `/code-review` before opening a PR; `/ship` runs the whole worktree → review → PR recipe.
- Tasks live in Notion (project page https://app.notion.com/p/4053f52c56c18004bbc6e30d10a1a4a3, "All Tasks" database): set the task to Doing when starting and Done when finished; one session per task, started in a worktree.
