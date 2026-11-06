import { Schema } from "effect";

/**
 * The two secret links of the foyer: the proprietaire arbitrates, the invite asks.
 */
export const Actor = Schema.Literals(["proprietaire", "invite"]);
export type Actor = Schema.Schema.Type<typeof Actor>;

/**
 * Where an article sits in one magasin. Absent = NonClasse ("Non classé").
 */
export const ArticleRayon = Schema.TaggedUnion({
  Rayon: { rayonId: Schema.NonEmptyString },
  PasVenduIci: {},
  NonClasse: {},
});
export type ArticleRayon = Schema.Schema.Type<typeof ArticleRayon>;

const Quantity = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)));
const id = Schema.NonEmptyString;

/**
 * Envelope shared by every journal entry, readable without knowing the payloads:
 * `at` is epoch milliseconds, `device` the opaque id of the device that wrote the
 * event, `magasin` the magasin the actor was in (when any).
 */
const envelope = {
  id,
  at: Schema.Int,
  actor: Actor,
  device: id,
};

function foyerEvent<const T extends string, const P extends Schema.Struct.Fields>(
  type: T,
  payload: P,
) {
  return Schema.Struct({
    ...envelope,
    magasin: Schema.NullOr(id),
    type: Schema.Literal(type),
    payload: Schema.Struct(payload),
  });
}

function magasinEvent<const T extends string, const P extends Schema.Struct.Fields>(
  type: T,
  payload: P,
) {
  return Schema.Struct({
    ...envelope,
    magasin: id,
    type: Schema.Literal(type),
    payload: Schema.Struct(payload),
  });
}

const name = Schema.NonEmptyString;

export const Event = Schema.Union([
  magasinEvent("MagasinCreated", { name }),
  magasinEvent("MagasinRenamed", { name }),
  magasinEvent("MagasinRemoved", {}),
  magasinEvent("RayonCreated", { rayonId: id, name }),
  magasinEvent("RayonRenamed", { rayonId: id, name }),
  magasinEvent("RayonsReordered", { rayonIds: Schema.Array(Schema.String) }),
  magasinEvent("RayonRemoved", { rayonId: id }),
  foyerEvent("ArticleCreated", { articleId: id, name }),
  foyerEvent("ArticleRenamed", { articleId: id, name }),
  foyerEvent("ArticleRemoved", { articleId: id }),
  foyerEvent("ArticleQuantitySet", { articleId: id, quantity: Quantity }),
  magasinEvent("ArticleRayonSet", { articleId: id, rayon: ArticleRayon }),
  foyerEvent("ArticleMarkedToBuy", { articleId: id }),
  foyerEvent("ArticleMarkedNotToBuy", { articleId: id }),
  foyerEvent("ArticleChecked", { articleId: id }),
  foyerEvent("ArticleUnchecked", { articleId: id }),
  magasinEvent("SortieFinished", {}),
  foyerEvent("DemandeCreated", { demandeId: id, name }),
  foyerEvent("DemandeAccepted", { demandeId: id, articleId: id }),
  foyerEvent("DemandeRefused", { demandeId: id }),
  foyerEvent("DemandeWithdrawn", { demandeId: id }),
]);
export type Event = Schema.Schema.Type<typeof Event>;
