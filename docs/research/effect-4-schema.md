# Effect 4 : Schema, Match, Data et services

Vérifié contre **Effect 4.1.2** (`effect` dans `packages/domain` et `packages/wire`), le 2026-11-04, dans les déclarations de `node_modules/effect/dist/*.d.ts` et le code de `packages/wire/src/event.ts`, `packages/domain/src/reducer.ts` et `packages/domain/src/ports.ts`. L'API diffère d'Effect 3 : un exemple écrit pour Effect 3 ne compile pas forcément ici.

## Schema

- **Import** : `import { Schema } from "effect"`. Le sous-chemin `effect/schema` existe mais n'exporte que `Model`, `VariantSchema` et les compilateurs de schéma, pas le module `Schema`.
  Pourquoi : un import depuis `effect/schema` ne trouve pas `Schema.Struct`.
- **`Schema.Union([A, B])`** prend un tableau de membres.
  Pourquoi : `Event` est une union de 19 structs, écrite ainsi.
- **`Schema.Literal(x)`** pour une seule valeur, **`Schema.Literals([x, y])`** pour plusieurs.
  Pourquoi : `Actor` est `Schema.Literals(["proprietaire", "invite"])`, le `type` de chaque événement un `Schema.Literal`.
- **`Schema.TaggedStruct("Tag", { ... })`** ajoute le champ `_tag`.
  Pourquoi : les trois membres de `ArticleRayon`.
- **`Schema.NullOr(S)`**, **`Schema.Array(S)`**, **`Schema.NonEmptyString`**.
  Pourquoi : le `magasin` nullable des événements du foyer, `rayonIds`, les ids et les noms.
- **`Schema.Int`** rejette `NaN` et `±Infinity` ; on le raffine avec `Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)))`. `check` prend un ou plusieurs filtres, `isGreaterThan` une borne exclusive.
  Pourquoi : la quantité d'un article est un entier strictement positif.
- **`Schema.Schema.Type<typeof S>`** donne le type décodé.
  Pourquoi : `Event`, `Actor` et `ArticleRayon` exportent un type du même nom que leur schéma.
- **`Schema.Struct.Fields`** est la contrainte d'une map de champs (un objet dont les valeurs sont des schémas).
  Pourquoi : les helpers génériques `foyerEvent` et `magasinEvent` prennent `const P extends Schema.Struct.Fields`.
- **Décoder** : `Schema.decodeUnknownSync(S)(input)` rend le type ou lève une erreur ; `Schema.decodeUnknownResult(S)(input)` rend un `Result<Type, SchemaError>`. Il n'y a plus de module `Either` (pas de `Either.d.ts`, `Result.d.ts` existe), ni de `decodeUnknownEither`.
  Pourquoi : la frontière où l'API et le web valident ce qui arrive du réseau ou d'IndexedDB.

## Match

- **`Match.type<U>().pipe(Match.discriminatorsExhaustive("type")({ ... }))`** associe un handler à chaque valeur du champ discriminant (disponible depuis 4.0.0). Un handler manquant est une erreur de type : vérifié avec une union `A | B` sans handler pour `B`, `tsc` répond `TS2345 … Property 'B' is missing`.
  Pourquoi : `fold` dispatche les événements ainsi, sans `switch` ; ajouter un type d'événement sans son handler fait échouer `pnpm check`.

## Data

- **`Data.TaggedEnum<{ A: {...}; B: Record<never, never> }>`** déclare l'union taguée, **`Data.taggedEnum<T>()`** en fabrique les constructeurs : `DemandeStatus.Pending()`, `DemandeStatus.Accepted({ articleId })`.
  Pourquoi : `DemandeStatus` et les `Section` de la liste, au lieu d'unions `_tag` écrites à la main.

## Services

- **`class X extends Context.Service<X, Shape>()("clé") {}`** déclare un service.
  Pourquoi : les ports `Clock`, `EventStore` et `SyncTransport`.
