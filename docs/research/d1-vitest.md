# D1 dans Vitest : `@cloudflare/vitest-plugin`

Vérifié le 2026-11-04 contre **`@cloudflare/vitest-plugin` 1.5.1**, vitest 5.1.0, wrangler 4.157.0 et `@cloudflare/workers-types` 5.20261104.1, à partir des métadonnées npm (`npm view`), des fichiers publiés du paquet (unpkg), de son [CHANGELOG](https://github.com/cloudflare/workers-sdk/blob/main/packages/vitest-plugin/CHANGELOG.md), de l'exemple [`fixtures/vitest-plugin-examples/d1`](https://github.com/cloudflare/workers-sdk/tree/main/fixtures/vitest-plugin-examples/d1) et du code de wrangler dans `node_modules`. Rien n'a été installé ni exécuté.

## Paquet et version

- **`@cloudflare/vitest-pool-workers` est renommé `@cloudflare/vitest-plugin`** depuis la 1.0.0 (2026-08-20). L'ancien paquet s'arrête à 0.23.0, marqué déprécié, avec un peer `vitest ^4.1.0`.
  Pourquoi : la plupart des exemples en ligne utilisent encore l'ancien nom. Source : `npm view @cloudflare/vitest-pool-workers@0.23.0 deprecated`, CHANGELOG § 1.0.0.
- **Version retenue : 1.5.1**, publiée le 2026-11-03T11:50Z, donc plus de 24 h avant aujourd'hui (21:55Z). Son peer est `vitest: "^4.1.0 || ^5.0.0"` : il accepte vitest 5.1.0. Elle dépend de `wrangler 4.157.0` (la version qu'on a déjà) et de `miniflare 5.20261103.0-beta`.
  Pourquoi : `minimumReleaseAge` de pnpm. Source : `npm view @cloudflare/vitest-plugin time --json` et `npm view @cloudflare/vitest-plugin@1.5.1 peerDependencies dependencies`.
- **Vitest 5 est accepté depuis la 1.4.0** ; les versions 1.0.0 à 1.3.7 exigent `^4.1.0`.
  Source : boucle `npm view …@<v> peerDependencies.vitest` sur toutes les versions, CHANGELOG § 1.4.0 (« Add support for Vitest 5 »).

## Configuration

- **Le plugin Vite `cloudflareTest()`**, importé depuis la racine `@cloudflare/vitest-plugin`, remplace `defineWorkersConfig` et `poolOptions.workers` (retirés en 0.13.0). `readD1Migrations` vient du même import. Il n'existe pas de sous-chemin `/config` : `exports` ne déclare que `.` et `./types`, même si la page de configuration de la doc mentionne encore `@cloudflare/vitest-plugin/config`.
  Source : `npm view @cloudflare/vitest-plugin@1.5.1 exports`, `dist/pool/index.d.mts`, CHANGELOG § 0.13.0, [doc Configuration](https://developers.cloudflare.com/workers/testing/vitest-integration/configuration/).
- **Options utiles** : `wrangler: { configPath, environment }`, `miniflare` (les bindings ajoutés ici l'emportent sur le fichier wrangler), `main`. `cloudflareTest` accepte aussi une fonction, éventuellement async, qui rend ces options.
  Source : `dist/pool/index.d.mts`.
- **`vitest.config.ts`**, calqué sur l'exemple `d1` :

  ```ts
  import path from "node:path";
  import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
  import { defineConfig } from "vitest/config";

  export default defineConfig(async () => {
    const migrations = await readD1Migrations(path.join(import.meta.dirname, "migrations"));
    return {
      plugins: [
        cloudflareTest({
          wrangler: { configPath: "./wrangler.jsonc" },
          miniflare: { bindings: { TEST_MIGRATIONS: migrations } },
        }),
      ],
      test: { setupFiles: ["./test/apply-migrations.ts"] },
    };
  });
  ```

## Migrations dans les tests

- **`readD1Migrations(path)`** tourne dans Node (fichier de config) et rend `D1Migration[]` (`{ name, queries }`). Avec un chemin, il ne lit que les `*.sql` à la racine du dossier ; un objet `{ migrationsDir, migrationsPattern }` couvre les dispositions imbriquées (1.2.0).
  Source : `dist/pool/index.d.mts`, CHANGELOG § 1.2.0.
- **`applyD1Migrations(db, migrations, table?)`**, importé de `cloudflare:test`, n'applique que les migrations absentes de la table `d1_migrations`.
  Pourquoi : le fichier de setup peut tourner plusieurs fois sans erreur. Source : `types/cloudflare-test.d.ts`, `test/apply-migrations.ts` de l'exemple.

  ```ts
  // test/apply-migrations.ts
  import { applyD1Migrations } from "cloudflare:test";
  import { env } from "cloudflare:workers";

  await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
  ```

## Types

- **`env` est typé `Cloudflare.Env`** (`@cloudflare/workers-types`, module `cloudflare:workers`) ; on l'étend par fusion de déclaration. `ProvidedEnv` n'existe plus.
  Source : `node_modules/@cloudflare/workers-types/index.d.ts` (`namespace Cloudflare { interface Env {} }`), `test/env.d.ts` de l'exemple.

  ```ts
  // test/env.d.ts
  declare namespace Cloudflare {
    interface Env {
      DB: D1Database;
      TEST_MIGRATIONS: import("cloudflare:test").D1Migration[];
    }
  }
  ```

- **tsconfig des tests** : `"types": ["@cloudflare/workers-types", "@cloudflare/vitest-plugin/types"]`, ce qui déclare le module `cloudflare:test`. Le tsconfig actuel d'`apps/api` n'inclut que `src`, il faut donc y ajouter `test`.
  Source : `exports["./types"]` → `types/cloudflare-test.d.ts`, `tsconfig.workerd-test.json` des exemples. Compatibilité avec TypeScript 7.0.2 : non vérifié.

## Isolation et appel de l'app

- **Le stockage est isolé par fichier de test, pas par test** : `isolatedStorage` et `singleWorker` ont été retirés en 0.13.0. Dans un même fichier, les écritures d'un test restent visibles aux suivants (c'est sur ça que compte `routes.test.ts` de l'exemple). `--max-workers=1 --no-isolate` fait partager le stockage à tous les fichiers.
  Source : CHANGELOG § 0.13.0, [doc Isolation](https://developers.cloudflare.com/workers/testing/vitest-integration/isolation-and-concurrency/).
- **`reset()`** (`cloudflare:test`, depuis 0.15.0) « supprime toutes les données des bindings ». Il reste à vérifier s'il supprime aussi le schéma D1 et la table `d1_migrations`, ce qui obligerait à réappliquer les migrations après coup (non vérifié).
  Source : `types/cloudflare-test.d.ts`, CHANGELOG § 0.15.0.
- **Appeler le Worker** : `exports.default.fetch(url, init)` depuis `cloudflare:workers` remplace `SELF.fetch`. `env` et `SELF` de `cloudflare:test` existent encore dans les types 1.5.1, mais sont marqués `@deprecated`. Autre possibilité, sans passer par le Worker : `app.request(path, init, env)` de Hono, dont le troisième argument est `Bindings`.
  Source : `types/cloudflare-test.d.ts`, `routes.test.ts` de l'exemple, `node_modules/hono/dist/types/hono-base.d.ts`.

## Wrangler et D1

- **Dossier par défaut `./migrations`**, table `d1_migrations`, qu'on change avec `migrations_dir` et `migrations_table` sur le binding. `wrangler d1 migrations create <db> <message>` crée `NNNN_<message>.sql` (numéro sur 4 chiffres, max + 1, espaces remplacés par `_`).
  Source : `wrangler-dist/cli.js` (`DEFAULT_MIGRATION_PATH`, `getNextMigrationNumber`, `pad(…, 4)`), [doc Migrations D1](https://developers.cloudflare.com/d1/reference/migrations/).
- **`wrangler d1 migrations apply <db>` et `wrangler d1 execute <db> --command "…" | --file x.sql`** visent la base **locale** par défaut ; `--remote` pour la base déployée. `migrations apply` demande une confirmation.
  Source : `isLocal(args, defaultValue = true)` dans `wrangler-dist/cli.js`, `wrangler d1 … --help` (4.157.0), [commandes D1](https://developers.cloudflare.com/workers/wrangler/commands/d1/).

## nodejs_compat

- **Aucun flag à ajouter.** Depuis la date de compatibilité 2026-08-04, workerd active `nodejs_compat` et `nodejs_compat_v2` par défaut, et notre date est 2026-11-01. Le plugin a besoin de `nodejs_compat_v2` et l'ajoute de lui-même. Si on déclare quand même `nodejs_compat`, il l'ignore au lieu de faire planter workerd (0.21.2).
  Source : CHANGELOG § 0.21.2 (#15148, #15123).
