# `api`

Le serveur de synchronisation : un Worker Hono sur Cloudflare qui garde le journal du foyer dans D1. Un déploiement est un foyer ; les deux liens secrets vivent hachés dans la table `lien` ([ADR 5](../../docs/adr/0005-un-foyer-par-deploiement-liens-haches-en-d1.md)). Le contrat HTTP est celui de [`@ecureuil/wire`](../../packages/wire/README.md#contrat-de-lapi).

## En local

Depuis la racine du repo :

```sh
pnpm --filter api db:migrate   # applique migrations/ à la D1 locale (.wrangler/state)
pnpm --filter api liens        # crée les deux liens et les affiche
pnpm --filter api dev          # http://localhost:8787
LIEN_SECRET=<secret-proprietaire> pnpm --filter api seed   # pousse le seed vers l'API locale
```

`liens` remplace les liens existants : les anciens secrets cessent de marcher. `--app-url <url>` change l'adresse de l'app dans les liens affichés (par défaut `http://localhost:5173`).

## En production

Amorcer le foyer, une fois, dans cet ordre :

1. Migrations : la CI les applique à la D1 de production avant chaque déploiement sur `main`.
2. Liens, après le premier déploiement (la table `lien` doit exister) :

   ```sh
   pnpm --filter api liens --remote --app-url https://<app>
   ```

3. Seed : pousse les magasins et items du foyer (le `seed` de `@ecureuil/domain`) dans le journal, avec le secret du lien propriétaire :

   ```sh
   API_URL=https://<api> LIEN_SECRET=<secret-proprietaire> pnpm --filter api seed --remote
   ```

`seed` lit `API_URL` et `LIEN_SECRET` dans l'environnement, jamais en argument, et ne les affiche pas. Sans `--remote`, il vise `http://localhost:8787`. Il n'envoie que les événements du propriétaire : la demande de l'invite du seed est ignorée (l'API refuserait tout le push), une vraie viendra par le lien invite. Le relancer ne change rien, l'API ignore les ids déjà reçus. Il s'arrête avec un code non nul sur un 401 (secret inconnu), un 403 (secret de l'invite), un 400 ou une erreur réseau.

## Push et pull

```sh
curl -i -X POST http://localhost:8787/journal \
  -H "Authorization: Bearer <secret-proprietaire>" \
  -d '{"events":[{"id":"e1","at":1762300000000,"actor":"proprietaire","device":"iphone","magasin":null,"type":"ItemCreated","payload":{"itemId":"lait","name":"Lait"}}]}'
# 204, et 204 encore si on rejoue : l'id e1 est déjà là

curl http://localhost:8787/journal -H "Authorization: Bearer <secret-proprietaire>"
# {"events":[…],"cursor":"1"}

curl "http://localhost:8787/journal?since=1" -H "Authorization: Bearer <secret-invite>"
# {"events":[],"cursor":"1"}
```

- Le rôle vient du secret : un push dont un événement porte un autre `actor` est refusé en bloc (403), rien n'est écrit.
- Le curseur est le `seq` du dernier événement vu. Un journal vide rend `"0"`. Le `seq` ne sert qu'à la sync ; l'ordre de relecture reste `(at, id)` côté domaine ([ADR 4](../../docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md)).
- La route accepte toutes les origines (CORS `*`) : l'app est servie par Pages, sur une autre origine, et l'accès repose sur le secret, jamais sur un cookie.
- `401` sans secret reconnu, `400` pour un corps ou un curseur invalide (avec le message du schéma).

## Tests

`pnpm test` tourne dans workerd contre une vraie D1 locale, migrations appliquées ([recherche](../../docs/research/d1-vitest.md)).
