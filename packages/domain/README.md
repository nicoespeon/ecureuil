# `@ecureuil/domain`

Le cœur du domaine : l'état du foyer est la relecture du journal par un reducer pur ([ADR 2](../../docs/adr/0002-journal-d-evenements-comme-primitive-de-sync.md), [ADR 4](../../docs/adr/0004-enveloppe-du-journal-et-ordre-de-relecture.md)). Aucune I/O : le stockage, la synchronisation et l'horloge passent par trois ports. Effect reste ici et dans `@ecureuil/wire` ([ADR 3](../../docs/adr/0003-hebergement-cloudflare-effect-confine-au-coeur.md)) ; les composants React consomment `State` et `Liste`, des objets simples. Les termes (Foyer, Magasin, Rayon, Article, Liste, Panier, Sortie, Achat, Demande) sont définis dans le [glossaire](../../GLOSSARY.md).

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
- `ArticleRayonSet { articleId, rayon }` : `rayon` est un `ArticleRayon` (`Rayon { rayonId }`, `PasVenduIci` ou `NonClasse`)
- `SortieFinished {}`

Du foyer (`magasin` est un contexte, `null` permis) :

- `ArticleCreated { articleId, name }`
- `ArticleRenamed { articleId, name }`
- `ArticleRemoved { articleId }`
- `ArticleQuantitySet { articleId, quantity }`
- `ArticleMarkedToBuy { articleId }`
- `ArticleMarkedNotToBuy { articleId }`
- `ArticleChecked { articleId }`
- `ArticleUnchecked { articleId }`
- `DemandeCreated { demandeId, name }`
- `DemandeAccepted { demandeId, articleId }`
- `DemandeRefused { demandeId }`
- `DemandeWithdrawn { demandeId }` : l'invité retire sa demande

## `State`

```ts
type State = {
  magasins: Record<string, { id; name; rayons: { id; name }[] }>; // rayons dans l'ordre du magasin
  articles: Record<string, {
    id; name; quantity; // quantity : 1 à la création
    status: "notToBuy" | "toBuy" | "inCart";
    rayonParMagasin: Record<magasinId, Rayon { rayonId } | PasVenduIci>; // absent = NonClasse
  }>;
  demandes: Record<string, { id; name; requestedAt; status: Pending | Accepted { articleId } | Refused | Withdrawn }>;
  sorties: { id; magasin; at; achats: { articleId; quantity }[] }[]; // id = id du SortieFinished
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
  sections: (Rayon { rayonId; name; articles } | NonClasse { articles })[];
  pasVenduIci: ListArticle[];
  panier: ListArticle[];
};
type ListArticle = { id; name; quantity };
```

- `sections` : les rayons du magasin dans leur ordre, puis `NonClasse` ; les sections vides sont omises. Seuls les articles `toBuy` y figurent.
- `pasVenduIci` : les articles `toBuy` marqués `PasVenduIci` dans ce magasin.
- `panier` : les articles `inCart`, quel que soit leur rayon.
- Dans chaque groupe, les articles sont triés par nom (`localeCompare` en `fr`).

Changer de magasin retrie les mêmes articles, sans en changer le contenu. Les demandes en attente n'en font pas partie.

## Les demandes

- `pendingDemandes(state)` : les demandes `Pending`, la plus ancienne d'abord : la section « À valider » du propriétaire, et « Mes demandes » de l'invité.
- `duplicateOf(state, name)` : `"Liste"` si un article de ce nom est déjà sur la liste (à acheter ou dans le panier), `"Demande"` si une demande de ce nom attend encore, sinon `undefined`. L'invité ne redemande pas ce qui est déjà là.
- `articleNamed(state, name)` : l'article du catalogue qui porte ce nom, sans tenir compte des espaces autour, de la casse ni des accents (« pates » trouve « Pâtes »). Accepter une demande réutilise cet article plutôt que d'en créer un second.

## Règles du domaine

Les règles de conflit générales viennent de l'ordre de relecture (ADR 4) : dernier écrit gagne, premier arbitrage gagne, un événement visant une entité inconnue ou supprimée est ignoré, une création dont l'id existe déjà aussi. En plus :

- `ArticleRayonSet` vers un magasin inconnu, ou vers un rayon absent de ce magasin, est ignoré. `ArticleRayonSet` avec `NonClasse` retire l'entrée du magasin.
- `RayonRemoved` renvoie ses articles à `NonClasse` dans ce magasin.
- `RayonsReordered` élimine les ids en double et ignore les ids inconnus ; les rayons non mentionnés (créés en parallèle sur un autre appareil) gardent leur ordre, après ceux qui le sont.
- Une demande n'est décidée qu'une fois : le premier de `DemandeAccepted`, `DemandeRefused` ou `DemandeWithdrawn` gagne, les suivants sont ignorés.
- `DemandeAccepted` vers un article inconnu laisse la demande `Pending`. Acceptée, elle met l'article sur la liste.
- `ArticleChecked` sur un article `notToBuy` est ignoré ; `ArticleUnchecked` ne fait revenir à `toBuy` qu'un article `inCart`. `ArticleMarkedToBuy` laisse dans le panier un article déjà `inCart`.
- `SortieFinished` enregistre une `Sortie` dont les achats sont les articles `inCart` avec leur quantité, puis les repasse à `notToBuy`. La quantité de l'article survit à la sortie.

## Seed

`seed` est un journal de dev réaliste : Costco et Maxi avec leurs rayons dans l'ordre du parcours, une vingtaine d'articles (ceux de la liste Cookidoo en tête), dont une partie à acheter, quelques-uns « Non classé » ou « Pas chez Maxi », et une demande de l'invité en attente. Il sert aux tests et aux agents qui ont besoin d'un foyer peuplé.

```ts
import { fold, listForMagasin, seed } from "@ecureuil/domain";

const state = fold(seed);
const liste = listForMagasin(state, "magasin-costco");
```

Il est déterministe : ids lisibles et fixes (`magasin-costco`, `rayon-costco-boulangerie`, `article-lait`), `at` croissant d'une minute à partir d'une epoch fixe, `device` `seed`. Chaque événement est décodé par le schéma `Event` de `@ecureuil/wire`, donc la fixture casse au chargement si elle sort du contrat. En dev, l'app web le charge dans un journal local vide, marqué déjà poussé : il n'est jamais envoyé au serveur (il contient une demande de l'invité, que le lien du propriétaire ne peut pas pousser).

`seedSorties` ajoute cinq sorties passées (trois à Costco, deux à Maxi) pour que les articles fréquents de l'ajout rapide aient de quoi s'afficher en dev. Elles restent hors de `seed`, que la commande `seed` de l'API pousse en production, où de fausses sorties fausseraient les vrais fréquents. Leurs articles ne sont pas sur la liste du seed, qui reste la même.

## Ports

Services Effect (`Context.Service`), sans implémentation ici :

- `Clock` : `now: Effect<number>`, en millisecondes epoch.
- `EventStore` : `append(events)` (écrits ici, en attente de push), `all`, `unpushed`, `markPushed(ids)`, `cursor`, et `receive({ events, cursor })`, qui garde les événements tirés comme poussés (ils sont sur le serveur) et le curseur, d'un coup ([ADR 6](../../docs/adr/0006-boucle-de-sync-dans-le-domaine.md)).
- `SyncTransport` : `push(events)`, `pull(since: Cursor | null)` → `{ events, cursor }`, qui échouent en `TransportError` (hors ligne, refus du serveur). `Cursor` est une chaîne opaque fournie par le serveur.

## `sync`

Un tour de synchronisation sur les ports : pousse `unpushed`, les marque poussés par leurs ids, tire depuis `cursor`, `receive`. Un geste fait pendant le push attend le tour suivant. Un push en échec n'empêche pas le tirage, puis fait échouer le tour : ce qui n'est pas parti attend le suivant. Quand lancer un tour (geste, réseau revenu, intervalle) est l'affaire de l'app.
