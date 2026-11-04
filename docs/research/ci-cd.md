# CI/CD : GitHub Actions, Cloudflare, Renovate

Faits vérifiés le 2026-11-04 pour [`.github/workflows`](../../.github/workflows) et [`renovate.json`](../../renovate.json). Chaque fait porte sa source ; « vérifié localement » veut dire lu dans `node_modules` (wrangler 4.157.0, renovate 44.216.0) ou observé en lançant la commande.

## Versions des actions

| Action                       | Dernière release | Épinglée à                                   |
| ---------------------------- | ---------------- | -------------------------------------------- |
| `actions/checkout`           | v7.0.1           | `v7`                                         |
| `actions/setup-node`         | v7.1.0           | `v7`                                         |
| `pnpm/action-setup`          | v6.1.1           | `v6`                                         |
| `cloudflare/wrangler-action` | v4.1.3           | `v4`                                         |
| `renovatebot/github-action`  | v46.3.12         | `v46.3.12` (le dépôt ne publie pas de `v46`) |

Source : `gh release list` et `gh api repos/<repo>/git/ref/tags/<tag>` (404 pour `renovatebot/github-action` `v46`). `config:best-practices` épingle ensuite les actions par digest via une PR Renovate.

## Node et pnpm sans doublon

- `actions/setup-node` lit `.tool-versions` via `node-version-file` ; `cache: pnpm` met en cache le store pnpm. [setup-node, advanced usage](https://github.com/actions/setup-node/blob/main/docs/advanced-usage.md)
- `pnpm/action-setup` sans `version` lit `packageManager` dans `package.json`. [pnpm/action-setup](https://github.com/pnpm/action-setup)

## pnpm 12 : `minimumReleaseAge` par défaut

Un `pnpm install --frozen-lockfile` avec un cache vide refuse les paquets publiés depuis moins d'un jour (`ERR_PNPM_MINIMUM_RELEASE_AGE_VIOLATION`), même s'ils sont déjà dans le lockfile. En local, la vérification est mise en cache (« verified 8s ago ») et ne le montre pas ; en CI, le cache est vide. Vérifié localement avec des `XDG_*_HOME` et un `--store-dir` vides : Biome 2.6.5 et `@cloudflare/workers-types@5.20261104.1`, publiés le 2026-11-04, sont refusés jusqu'au 2026-11-05 vers 12:46 UTC.

`pnpm add` contourne en ajoutant `minimumReleaseAgeExclude` à `pnpm-workspace.yaml` ; ne pas garder cet ajout sans raison. Renovate attend déjà 3 jours (`config:best-practices`), donc ses PR passent la politique de pnpm.

## Cloudflare Pages (`apps/web`)

- `wrangler pages deploy` lit `name` et `pages_build_output_dir` dans le `wrangler.jsonc` du dossier courant ; avec `pages_build_output_dir`, le fichier devient la source de vérité du projet. Vérifié localement (`args.directory ?? config2?.pages_build_output_dir`, `args.projectName ?? config2?.name`) ; [Pages, configuration Wrangler](https://developers.cloudflare.com/pages/functions/wrangler-configuration/).
- En mode non interactif, un projet absent fait échouer le déploiement (« The Pages project … does not exist … start by running: `wrangler pages project create` »). Le projet se crée une fois à la main. Vérifié localement.
- Wrangler 4.157 délègue `pages deploy` vers un déploiement **Workers** quand il détecte un agent IA et que le projet Pages n'existe pas (`maybeDelegatePagesToWorkers`). Ce n'est pas le cas en CI, mais un agent ne doit pas lancer `pages deploy` avant que le projet existe. Vérifié localement.
- Les déploiements sur la branche de production (`main`) mettent à jour le site ; les autres branches sont des previews, `<hash>.<projet>.pages.dev` plus l'alias `<branche>.<projet>.pages.dev` (minuscules, caractères non alphanumériques remplacés par `-`). Les previews sont publiques par défaut. [Preview deployments](https://developers.cloudflare.com/pages/configuration/preview-deployments/)
- Token API : compte, Cloudflare Pages, Edit. [Direct Upload et CI](https://developers.cloudflare.com/pages/how-to/use-direct-upload-with-continuous-integration/)

## Workers (`apps/api`)

- Une URL de preview de version « uses that Worker version's existing configuration and resources instead of creating a separate environment » : une preview d'API utiliserait la base D1 de production. Pas de preview d'API par PR, donc. [Workers previews](https://developers.cloudflare.com/workers/configuration/previews/)
- Les URL de preview exigent `workers.dev`. Même source.

## `cloudflare/wrangler-action`

- Si wrangler est installé dans `workingDirectory`, l'action l'utilise (`<pm> exec wrangler --version`) ; sinon elle l'installe dans ce dossier. D'où `wrangler` en devDependency de `apps/web` comme de `apps/api`. [wranglerAction.ts](https://github.com/cloudflare/wrangler-action/blob/main/src/wranglerAction.ts)
- `command` passe par `@actions/exec`, pas par un shell. Même source.
- Output `deployment-url` : `targets[0]` pour `deploy` (Workers), `url` pour `pages deploy`. L'action crée un déploiement GitHub pour Pages quand `gitHubToken` est fourni. [commandOutputParsing.ts](https://github.com/cloudflare/wrangler-action/blob/main/src/commandOutputParsing.ts)

## Renovate self-hosted

- `renovatebot/github-action` : `token` est un PAT classique (`repo`, ou `public_repo` pour un dépôt public) ; il faut aussi `workflow` pour que Renovate mette à jour `.github/workflows`. Les PAT fine-grained ont des trous (Checks). Une GitHub App passe par `actions/create-github-app-token`. Avec `GITHUB_TOKEN`, la CI des PR de Renovate ne se déclenche pas sans approbation manuelle. [renovatebot/github-action](https://github.com/renovatebot/github-action)
- Les variables `RENOVATE_*` passent au conteneur. `RENOVATE_REPOSITORIES=owner/repo` devient `["owner/repo"]` (JSON5, sinon découpage par virgules). Vérifié localement (`workers/global/config/parse/coersions.js`).
- `config:best-practices` = `config:recommended` + digests des actions et images Docker, devDependencies épinglées, `minimumReleaseAge` de 3 jours pour npm, lockfile maintenance hebdomadaire (lundi tôt), migration de config. [Config presets](https://docs.renovatebot.com/presets-config/)
- Le planning de lockfile maintenance est remplacé par `at any time` : le cron du workflow est le seul planning, sinon les deux doivent coïncider.
- `platformAutomerge` (par défaut) active l'auto-merge GitHub sur la PR. Renovate ne fusionne lui-même qu'une PR par branche cible et par passage. [Automerge](https://docs.renovatebot.com/key-concepts/automerge/)
- L'auto-merge GitHub « merges a pull request automatically after all required reviews and status checks pass » : il n'attend que les checks **requis**. Les ajouter au ruleset `main` avant le premier passage de Renovate. [GitHub, auto-merge](https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/incorporating-changes-from-a-pull-request/automatically-merging-a-pull-request)
- `renovate-config-validator --strict` valide `renovate.json` ; le même outil rejette `rangeStrategy: "nope"`. Vérifié localement.
