---

name: pr-ecureuil
description: Write the title and French body of an Écureuil pull request, then open it with `gh pr create`. Use in this repo, in place of the global `pr-description`, whenever a session opens a PR, writes or rewrites a PR body, or is asked for `/pr-description`.
---

# Écureuil pull request

The reader is a developer or architect who wants to see how the structure of the code changes, not the code. They read the body once, on GitHub, before commenting line by line. Write for that **reviewer**: the outcome first, then the map, then the calls they may want to challenge. Anything only Nicolas needs (a question, an option awaiting his call) goes to chat, never into the body.

Body in French. Code, identifiers and technical vocabulary stay in English, as in [`CLAUDE.md`](../../../CLAUDE.md) "Language". First person singular is fine (« J'ai mis 100 plutôt que 72 »).

## Steps

### 1. Gather

Run in parallel:

- `git log main..HEAD --oneline` and `git diff main...HEAD --stat`: the packages touched.
- `git status`: the tree is clean and every commit is pushed (`git push -u origin <branch>`, alone in its command).
- The Notion task URL and title, from the brief that started the session.

Done when you can name every package or doc folder the diff touches.

### 2. QA evidence

Any change a person can see gets evidence, captured by the session itself before the PR opens:

- **UI change** → before/after screenshots at 375 px (the phone), plus one at desktop width when the layout changes there.
- **Interaction change** (a gesture, an animation, a dialog) → a short `.webm` video of the interaction.
- **API change** → a short `curl` session against `pnpm --filter api dev`, secrets masked.
- Docs, CI, tooling only → no evidence section.

Capture with `pnpm qa:capture` when the root `package.json` has that script (read its `--help` first); otherwise drive Playwright or the built-in browser by hand over the dev seed. Write the files to the session scratchpad, never into the repo.

Done when each visible change has its file, or the PR has no visible change.

### 3. Title

`type(scope)?: sujet`, at most 100 characters, imperative or nominal, no trailing period. It becomes the squash commit on `main`, so it names the change, not the task. Scope is the package when there is one: `web`, `api`, `domain`, `wire`. French domain nouns are welcome. Name what the reader gets, in plain words: « mode hors ligne et synchronisation du journal », not « journal IndexedDB et sync push/pull hors ligne avec l'API ».

```sh
node .github/scripts/check-pr-title.mjs "feat(web): liste par magasin, panier et fin des courses"
```

Done when the script exits 0.

### 4. Links

Every reference is a link: the Notion task, each ADR, each glossary term, each file or folder named. Pin links to the pushed head commit, never to the branch name: the repo deletes the branch on merge, and every `blob/<branch>/…` link then answers 404.

```sh
sha=$(git rev-parse HEAD)
# file:     https://github.com/nicoespeon/ecureuil/blob/$sha/docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md
# folder:   https://github.com/nicoespeon/ecureuil/tree/$sha/apps/web/src/journal
# glossary: https://github.com/nicoespeon/ecureuil/blob/$sha/GLOSSARY.md#L9   (the term's line)
```

Link text is the name the reader knows: `[ADR 4](…)`, `[Panier](…)`, ``[`journal/`](…)``.

### 5. Body

Use this shape; drop any section with nothing to say.

```markdown
Tâche Notion : [<task title>](<notion url>).

<One to three sentences: what the app, the API or the repo does now that it did not before, and the risk if any (a manual step, a migration, existing data).>

<Before/after table, right here, for a UI change.>

## Ce qui change

- **`apps/web`** ([`liste/`](…)) : <what this module now owns, and why there>.
- **`packages/domain`** : …
- **Docs** : [ADR 6](…), the term [Achat](…) in the glossary.

<Mermaid flowchart, only when the change adds or reroutes a flow between modules.>

## QA

<Screenshots with one caption each, the video, or the curl session. One paragraph on what you checked by hand: keyboard, accessible names, contrast, reduced motion.>

## Décisions à relire

- **<The call, in bold.>** <One or two sentences: why, and the tradeoff accepted.>
```

The map in "Ce qui change" is one bullet per package or doc folder touched, each naming the module and its new responsibility. A refactor says what is different about the structure now and why it matters.

"Décisions à relire" holds the calls a reviewer could reasonably make differently: a threshold, a fallback, a library over a hand-rolled one, a rule bent. A decision already recorded in an ADR gets a link, not a restatement.

Manual steps outside the repo (a secret to add, a Cloudflare resource to create) go in a numbered `## Avant le merge` section with the exact commands.

Images: reference each attached file as `![<alt in French>](./after.png)` where it belongs; a video goes on its own line as `![](./interaction.webm)` and renders as a player. Before/after:

```markdown
| Avant                                  | Après                                                     |
| -------------------------------------- | --------------------------------------------------------- |
| ![Avant : le titre seul](./before.png) | ![Après : la liste Costco groupée par rayon](./after.png) |
```

Done when every package from step 1 has its bullet and every reference is a pinned link.

### 6. Edit

Three passes, in order:

1. **Cut.** Re-read with one job: fewer words, no fact lost. Keep it to what the change is and why. Each section answers one question; a paragraph runs three sentences at most. The diff, CI and Notion already cover the commit history, the test list, lint and type checks, and what the task left for later, so the body describes the change as one piece.
2. **Plain words.** Everyday French or the standard technical term, never a coined one: a word the reader would not use themselves, or a common word bent to a new meaning, costs them a translation. « un tour de synchronisation » → « une synchronisation » ; « geste » → « action » ; « tirage » → « pull » ; « gagne la comptabilité du push » → « retient quels événements restent à envoyer » ; « au retour au premier plan » → « au retour sur l'onglet ». Glossary terms are the exception: they are the vocabulary, link them.
3. **`/stop-slop`** on the result.

Done when all three passes ran on the final text, title included.

### 7. Open

Open the PR ready for review: `/code-review` and QA happened before this step, the PR is the QA gate, and Nicolas reviews it comment by comment, so it opens finished.

```sh
gh pr create --base main --title "<title>" --body-file <body.md> \
  --attach './before.png#Avant : …' --attach './after.png#Après : …' --attach ./interaction.webm
```

Up to 50 files per command. If an upload fails, gh still creates the PR and prints its URL with a non-zero exit: add the missing file with `gh pr edit <N> --attach`.

Done when the command prints the PR URL. Merging, auto-merge and moving the Notion task to Done belong to Nicolas.

## Once the PR is open

Review comments come one by one: answer each on its own thread, with the reasoning and the sha of the commit that applied it. When a change makes the body wrong, read the current body (`gh pr view <N> --json body -q .body`), change only the affected lines, and keep the links pinned (a new sha for files that changed). Nicolas may have edited the body himself, so build on what is there.
