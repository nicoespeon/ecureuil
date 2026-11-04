# `@ecureuil/wire`

Le contrat Effect Schema partagé par `apps/web` et `apps/api` : le schéma `Event` du journal et ses morceaux (`Actor`, `ItemRayon`). Web et API valident le même contrat ([ADR 3](../../docs/adr/0003-hebergement-cloudflare-effect-confine-au-coeur.md), [ADR 4](../../docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md)). La liste des événements et ce qu'ils font est dans le [README du domaine](../domain/README.md).

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

- `id`, `device` et tous les ids de payload (`itemId`, `rayonId`, `demandeId`) sont des `NonEmptyString`. Exception : `RayonsReordered.rayonIds` est un tableau de `String` ; le reducer ignore les ids inconnus.
- `name` est une `NonEmptyString`.
- `at` est un entier (millisecondes epoch).
- `quantity` est un entier strictement positif.
- `actor` vaut `"proprietaire"` ou `"invite"`.
- `magasin` est obligatoire pour les événements liés à un magasin, `string | null` pour ceux du foyer.
- `ItemRayon` est une union taguée : `{ _tag: "Rayon", rayonId }`, `{ _tag: "PasVenduIci" }` ou `{ _tag: "NonClasse" }`.
