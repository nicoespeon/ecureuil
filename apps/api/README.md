# `api`

Le serveur de synchronisation : un Worker Hono sur Cloudflare qui garde le journal du foyer dans D1. Un déploiement est un foyer ; les deux liens secrets vivent hachés dans la table `lien` ([ADR 5](../../docs/adr/0005-un-foyer-par-deploiement-liens-haches-en-d1.md)). Le contrat HTTP est celui de [`@ecureuil/wire`](../../packages/wire/README.md#contrat-de-lapi).

## En local

Depuis la racine du repo :

```sh
pnpm --filter api db:migrate   # applique migrations/ à la D1 locale (.wrangler/state)
pnpm --filter api liens        # crée les deux liens et les affiche
pnpm --filter api dev          # http://localhost:8787
```

`liens` remplace les liens existants : les anciens secrets cessent de marcher. `--app-url <url>` change l'adresse de l'app dans les liens affichés (par défaut `http://localhost:5173`).

## En production

La CI applique les migrations à la D1 de production avant chaque déploiement sur `main`. Les liens se créent à la main, une fois, après le premier déploiement (la table `lien` doit exister) :

```sh
pnpm --filter api liens --remote --app-url https://<app>
```

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
- `401` sans secret reconnu, `400` pour un corps ou un curseur invalide (avec le message du schéma).

## Tests

`pnpm test` tourne dans workerd contre une vraie D1 locale, migrations appliquées ([recherche](../../docs/research/d1-vitest.md)).
