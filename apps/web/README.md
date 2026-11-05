# `web`

La PWA : React consomme l'état replié du journal ([`@ecureuil/domain`](../../packages/domain/README.md)) et des fonctions simples. Le journal de l'appareil vit dans IndexedDB ; la boucle de sync le pousse et le tire vers l'API ([ADR 6](../../docs/adr/0006-boucle-de-sync-dans-le-domaine.md)).

## Le journal de l'appareil

- `localJournal.ts` : le journal dans IndexedDB (base `ecureuil`), vu comme un `Journal` synchrone pour React et comme l'`EventStore` du domaine.
- `httpTransport.ts` : le `SyncTransport` vers `/journal`, selon [`@ecureuil/wire`](../../packages/wire/README.md#contrat-de-lapi).
- `startSync.ts` : lance un tour de `sync` au démarrage, au retour du réseau (`online`), au retour au premier plan et toutes les 30 s tant que l'app est au premier plan, un tour à la fois ; `main.tsx` en demande un après chaque geste.
- `device.ts` : l'id de l'appareil et le secret du lien, gardés en `localStorage`.

Si IndexedDB ne s'ouvre pas, l'app tourne sur un journal en mémoire, sans sync, le temps de la page.

En dev (`pnpm --filter web dev`), un journal vide reçoit le `seed` du domaine, marqué déjà poussé : il n'est jamais envoyé au serveur. En production, le journal démarre vide et se remplit par le tirage.

## Synchroniser avec l'API

Sans URL d'API ou sans secret, l'appareil fonctionne seul, sans sync. Pour l'activer en local :

```sh
pnpm --filter api db:migrate
pnpm --filter api liens        # affiche http://localhost:5173/#<secret> par rôle
pnpm --filter api dev          # http://localhost:8787
echo "VITE_API_URL=http://localhost:8787" > apps/web/.env.local
pnpm --filter web dev
```

Puis ouvrir le lien du propriétaire affiché par `liens`. Le secret arrive dans le fragment de l'URL, qui ne part jamais au serveur ; l'app le garde dans `localStorage` (`ecureuil.lien`) et le retire de la barre d'adresse. On peut aussi le coller à la main dans la console : `localStorage.setItem("ecureuil.lien", "<secret>")`.

Seul le lien du propriétaire peut pousser pour l'instant : l'app écrit ses événements au nom du propriétaire, et l'API refuse un push dont l'`actor` n'est pas le rôle du lien.

En production, la CI construit l'app avec la variable de dépôt GitHub `API_URL` (l'origine du Worker) en `VITE_API_URL`.
