# `web`

La PWA : React consomme l'état replié du journal ([`@ecureuil/domain`](../../packages/domain/README.md)) et des fonctions simples. Le journal de l'appareil vit dans IndexedDB ; la boucle de sync le pousse et le tire vers l'API ([ADR 6](../../docs/adr/0006-boucle-de-sync-dans-le-domaine.md)).

## Le journal de l'appareil

- `localJournal.ts` : le journal dans IndexedDB (base `ecureuil`), vu comme un `Journal` synchrone pour React et comme l'`EventStore` du domaine.
- `httpTransport.ts` : le `SyncTransport` vers `/journal`, selon [`@ecureuil/wire`](../../packages/wire/README.md#contrat-de-lapi).
- `startSync.ts` : lance un tour de `sync` au démarrage, au retour du réseau (`online`), au retour au premier plan et toutes les 30 s tant que l'app est au premier plan, un tour à la fois ; `main.tsx` en demande un après chaque geste.
- `device.ts` : ce que l'appareil garde en `localStorage` : son id, son nom, le secret du lien et le rôle appris pour ce secret.

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

Puis ouvrir un lien affiché par `liens`. Le secret arrive dans le fragment de l'URL, qui ne part jamais au serveur ; l'app le garde dans `localStorage` (`ecureuil.lien`) et le retire de la barre d'adresse. Une PWA installée n'a pas de barre d'adresse : on colle alors le lien dans le champ « Lien d'accès » de l'écran d'accueil (sans magasin) ou des réglages.

## Accès : rôle, nom, réglages

Le dossier `src/acces/` dit qui utilise l'appareil.

- **Rôle** : au démarrage, l'app demande son rôle à l'API (`GET /lien`) et le garde (`ecureuil.role`). Tant qu'elle ne le connaît pas, elle n'ouvre pas la liste (« Connexion en cours… », puis « Réessayer » hors ligne) : un événement écrit avec le mauvais rôle serait refusé par l'API à chaque envoi. Une fois appris, le rôle ouvre l'app même hors ligne. Chaque événement porte ce rôle en `actor`. Sans API ou sans lien, l'appareil fonctionne seul, en propriétaire.
- **Lien refusé** : si l'API répond 401 (lien remplacé), l'app affiche « Ce lien ne marche plus » et le champ pour coller le nouveau. Ouvrir ou coller un autre lien oublie le rôle appris et redémarre l'app.
- **Réglages** (bouton dans le header) : le nom de l'appareil (`ecureuil.deviceName`, il reste sur l'appareil) et le rôle. Pour le propriétaire, la date du lien de l'invité (`GET /lien`) ; « Nouveau lien pour Mariane » le remplace après confirmation (`POST /lien/invite`), « Créer le lien pour Mariane » le crée sans confirmation quand il n'y en a pas. Le nouveau lien s'affiche une seule fois avec un bouton « Copier ». Tant que l'API n'a pas répondu depuis le lancement (hors ligne), cette partie ne s'affiche pas.

Le lien de Mariane se range dans le 1Password partagé du foyer : c'est là qu'elle le retrouve pour l'ouvrir sur un nouvel appareil.

En production, la CI construit l'app avec la variable de dépôt GitHub `API_URL` (l'origine du Worker) en `VITE_API_URL`.
