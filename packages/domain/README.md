# `@ecureuil/domain`

Le cœur du domaine : l'état du foyer est la relecture du journal par un reducer pur ([ADR 2](../../docs/adr/0002-journal-d-evenements-comme-primitive-de-sync.md), [ADR 4](../../docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md)). Aucune I/O : le stockage, la synchronisation et l'horloge passent par trois ports. Effect reste ici et dans `@ecureuil/wire` ([ADR 3](../../docs/adr/0003-hebergement-cloudflare-effect-confine-au-coeur.md)) ; les composants React consomment `State` et `Liste`, des objets simples. Les termes (Foyer, Magasin, Rayon, Item, Liste, Panier, Sortie, Achat, Demande) sont définis dans le [glossaire](../../GLOSSARY.md).

Package source-only : les consommateurs bundlent `src/index.ts`.

## Les événements

Le type `Event` vient de [`@ecureuil/wire`](../wire/README.md), qui le valide. Chaque événement porte l'enveloppe `{ id, at, actor, device, magasin, type, payload }` décrite par l'ADR 4 : `at` en millisecondes epoch, `actor` vaut `"proprietaire"` ou `"invite"`, `device` est l'id opaque de l'appareil.

Liés à un magasin (`magasin` obligatoire) :

- `MagasinCreated { name }` : `magasin` est l'id du nouveau magasin
- `MagasinRenamed { name }`
- `RayonCreated { rayonId, name }`
- `RayonRenamed { rayonId, name }`
- `RayonsReordered { rayonIds }`
- `RayonRemoved { rayonId }`
- `ItemRayonSet { itemId, rayon }` : `rayon` est un `ItemRayon` (`Rayon { rayonId }`, `PasVenduIci` ou `NonClasse`)
- `SortieFinished {}`

Du foyer (`magasin` est un contexte, `null` permis) :

- `ItemCreated { itemId, name }`
- `ItemRenamed { itemId, name }`
- `ItemRemoved { itemId }`
- `ItemQuantitySet { itemId, quantity }`
- `ItemMarkedToBuy { itemId }`
- `ItemMarkedNotToBuy { itemId }`
- `ItemChecked { itemId }`
- `ItemUnchecked { itemId }`
- `DemandeCreated { demandeId, name }`
- `DemandeAccepted { demandeId, itemId }`
- `DemandeRefused { demandeId }`

## `State`

```ts
type State = {
  magasins: Record<string, { id; name; rayons: { id; name }[] }>; // rayons dans l'ordre du magasin
  items: Record<string, {
    id; name; quantity; // quantity : 1 à la création
    status: "notToBuy" | "toBuy" | "inCart";
    rayonParMagasin: Record<magasinId, Rayon { rayonId } | PasVenduIci>; // absent = NonClasse
  }>;
  demandes: Record<string, { id; name; requestedAt; status: Pending | Accepted { itemId } | Refused }>;
  sorties: { id; magasin; at; achats: { itemId; quantity }[] }[]; // id = id du SortieFinished
};
```

`notToBuy` : au catalogue seulement ; `toBuy` : sur la liste ; `inCart` : dans le panier. `DemandeStatus` est un `Data.TaggedEnum`.

## `fold(events)`

`fold` élimine les ids en double, trie par `(at, id)` puis réduit dans cet ordre depuis `initialState`. Tous les appareils calculent le même ordre, donc le même état, quel que soit l'ordre d'arrivée (ADR 4).

Ne jamais réduire de façon incrémentale (appliquer un événement reçu à un état déjà calculé) : un événement synchronisé peut avoir un `at` antérieur à ceux déjà appliqués. On relit tout le journal.

Le dispatch passe par `Match.discriminatorsExhaustive("type")` : ajouter un type d'événement au schéma sans son handler fait échouer le typecheck.

## `listForMagasin(state, magasinId)`

Rend la `Liste` telle qu'on la parcourt dans un magasin :

```ts
type Liste = {
  sections: (Rayon { rayonId; name; items } | NonClasse { items })[];
  pasVenduIci: ListItem[];
  panier: ListItem[];
};
type ListItem = { id; name; quantity };
```

- `sections` : les rayons du magasin dans leur ordre, puis `NonClasse` ; les sections vides sont omises. Seuls les items `toBuy` y figurent.
- `pasVenduIci` : les items `toBuy` marqués `PasVenduIci` dans ce magasin.
- `panier` : les items `inCart`, quel que soit leur rayon.
- Dans chaque groupe, les items sont triés par nom (`localeCompare` en `fr`).

Changer de magasin retrie les mêmes items, sans en changer le contenu. Les demandes en attente n'en font pas partie : filtrer `state.demandes` sur `status._tag === "Pending"`.

## Règles du domaine

Les règles de conflit générales viennent de l'ordre de relecture (ADR 4) : dernier écrit gagne, premier arbitrage gagne, un événement visant une entité inconnue ou supprimée est ignoré, une création dont l'id existe déjà aussi. En plus :

- `ItemRayonSet` vers un magasin inconnu, ou vers un rayon absent de ce magasin, est ignoré. `ItemRayonSet` avec `NonClasse` retire l'entrée du magasin.
- `RayonRemoved` renvoie ses items à `NonClasse` dans ce magasin.
- `RayonsReordered` élimine les ids en double et ignore les ids inconnus ; les rayons non mentionnés (créés en parallèle sur un autre appareil) gardent leur ordre, après ceux qui le sont.
- `DemandeAccepted` vers un item inconnu laisse la demande `Pending`. Acceptée, elle met l'item sur la liste.
- `ItemChecked` sur un item `notToBuy` est ignoré ; `ItemUnchecked` ne fait revenir à `toBuy` qu'un item `inCart`. `ItemMarkedToBuy` laisse dans le panier un item déjà `inCart`.
- `SortieFinished` enregistre une `Sortie` dont les achats sont les items `inCart` avec leur quantité, puis les repasse à `notToBuy`. La quantité de l'item survit à la sortie.

## Ports

Services Effect (`Context.Service`), sans implémentation ici :

- `Clock` : `now: Effect<number>`, en millisecondes epoch.
- `EventStore` : `append(events)`, `all`.
- `SyncTransport` : `push(events)`, `pull(since: Cursor | null)` → `{ events, cursor }`. `Cursor` est une chaîne opaque fournie par le serveur.
