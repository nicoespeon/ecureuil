# `@ecureuil/wire`

Le contrat Effect Schema partagé par `apps/web` et `apps/api` : le schéma `Event` du journal et ses morceaux (`Actor`, `ArticleRayon`). Web et API valident le même contrat ([ADR 3](../../docs/adr/0003-hebergement-cloudflare-effect-confine-au-coeur.md), [ADR 4](../../docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md)). La liste des événements et ce qu'ils font est dans le [README du domaine](../domain/README.md).

Package source-only : les consommateurs bundlent `src/index.ts`.

## Décoder

Ce qui vient de l'extérieur (requête, IndexedDB, réponse du serveur) se décode une fois, à l'entrée, puis on fait confiance au type :

```ts
import { Event } from "@ecureuil/wire";
import { Schema } from "effect";

const event = Schema.decodeUnknownSync(Event)(raw); // lève une erreur si invalide
const result = Schema.decodeUnknownResult(Event)(raw); // Result<Event, SchemaError>
```

Les tests construisent leurs fixtures de la même façon, en décodant des objets simples.

## Contraintes

- `id`, `device` et tous les ids de payload (`articleId`, `rayonId`, `demandeId`) sont des `NonEmptyString`. Exception : `RayonsReordered.rayonIds` est un tableau de `String` ; le reducer ignore les ids inconnus.
- `name` est une `NonEmptyString`.
- `at` est un entier (millisecondes epoch).
- `quantity` est un entier strictement positif.
- `actor` vaut `"proprietaire"` ou `"invite"`.
- `magasin` est obligatoire pour les événements liés à un magasin, `string | null` pour ceux du foyer.
- `ArticleRayon` est une union taguée : `{ _tag: "Rayon", rayonId }`, `{ _tag: "PasVenduIci" }` ou `{ _tag: "NonClasse" }`. Ses constructeurs : `ArticleRayon.cases.Rayon.make({ rayonId })`, `ArticleRayon.cases.PasVenduIci.make({})`.

## Contrat de l'API

Toutes les routes sont authentifiées par l'en-tête `authorizationHeader` (`Authorization: Bearer <secret>`, le secret du lien propriétaire ou invité).

- **Push** : `POST /journal`, corps `PushRequest` (`{ events: Event[] }`), réponse `204` sans corps. Le serveur ignore les ids qu'il a déjà : un push rejoué ne crée rien.
- **Pull** : `GET /journal?since=<cursor>`, query `PullQuery`, réponse `PullResponse` (`{ events: Event[], cursor }`). Sans `since`, le serveur rend le journal depuis le début.

`Cursor` est une `NonEmptyString` opaque : le serveur la fabrique, le client la renvoie telle quelle au pull suivant.

- **Rôle du lien** : `GET /lien` (`lienPath`), réponse `LienResponse` (`{ role, invite }`) : le rôle du secret présenté, et `invite` vaut `{ createdAt }` (epoch ms) quand l'invité a un lien, `null` sinon.
- **Nouveau lien de l'invité** : `POST /lien/invite` (`inviteLienPath`), sans corps, réponse `NewLienResponse` (`{ secret }`). Réservé au propriétaire (`403` pour l'invité) ; l'ancien secret de l'invité cesse de marcher.
