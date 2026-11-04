import { Schema } from "effect";

/**
 * The two secret links of the foyer: the owner arbitrates, the guest demandes.
 */
export const Actor = Schema.Literals(["proprietaire", "invite"]);
export type Actor = Schema.Schema.Type<typeof Actor>;

/**
 * Where an item sits in one magasin. Absent = NonClasse ("Non classé").
 */
export const ItemRayon = Schema.Union([
  Schema.TaggedStruct("Rayon", { rayonId: Schema.NonEmptyString }),
  Schema.TaggedStruct("PasVenduIci", {}),
  Schema.TaggedStruct("NonClasse", {}),
]);
export type ItemRayon = Schema.Schema.Type<typeof ItemRayon>;

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
  magasinEvent("RayonCreated", { rayonId: id, name }),
  magasinEvent("RayonRenamed", { rayonId: id, name }),
  magasinEvent("RayonsReordered", { rayonIds: Schema.Array(Schema.String) }),
  magasinEvent("RayonRemoved", { rayonId: id }),
  foyerEvent("ItemCreated", { itemId: id, name }),
  foyerEvent("ItemRenamed", { itemId: id, name }),
  foyerEvent("ItemRemoved", { itemId: id }),
  foyerEvent("ItemQuantitySet", { itemId: id, quantity: Quantity }),
  magasinEvent("ItemRayonSet", { itemId: id, rayon: ItemRayon }),
  foyerEvent("ItemMarkedToBuy", { itemId: id }),
  foyerEvent("ItemMarkedNotToBuy", { itemId: id }),
  foyerEvent("ItemChecked", { itemId: id }),
  foyerEvent("ItemUnchecked", { itemId: id }),
  magasinEvent("SortieFinished", {}),
  foyerEvent("DemandeCreated", { demandeId: id, name }),
  foyerEvent("DemandeAccepted", { demandeId: id, itemId: id }),
  foyerEvent("DemandeRefused", { demandeId: id }),
]);
export type Event = Schema.Schema.Type<typeof Event>;
