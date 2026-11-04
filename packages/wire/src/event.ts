import { Schema } from "effect";

// The two secret links of the household: the owner arbitrates, the guest requests.
export const Actor = Schema.Literals(["owner", "guest"]);
export type Actor = Schema.Schema.Type<typeof Actor>;

// Where an item sits in one store. Absent = unfiled ("Non classé").
export const Filing = Schema.Union([
  Schema.TaggedStruct("Aisle", { aisleId: Schema.NonEmptyString }),
  Schema.TaggedStruct("NotSoldHere", {}),
  Schema.TaggedStruct("Unfiled", {}),
]);
export type Filing = Schema.Schema.Type<typeof Filing>;

const Quantity = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)));
const id = Schema.NonEmptyString;

// Envelope shared by every journal entry, readable without knowing the payloads:
// `at` is epoch milliseconds, `device` the opaque id of the device that wrote the
// event, `store` the store the actor was in (when any).
const envelope = {
  id,
  at: Schema.Int,
  actor: Actor,
  device: id,
};

function householdEvent<const T extends string, const P extends Schema.Struct.Fields>(
  type: T,
  payload: P,
) {
  return Schema.Struct({
    ...envelope,
    store: Schema.NullOr(id),
    type: Schema.Literal(type),
    payload: Schema.Struct(payload),
  });
}

function storeEvent<const T extends string, const P extends Schema.Struct.Fields>(
  type: T,
  payload: P,
) {
  return Schema.Struct({
    ...envelope,
    store: id,
    type: Schema.Literal(type),
    payload: Schema.Struct(payload),
  });
}

const name = Schema.NonEmptyString;

export const Event = Schema.Union([
  storeEvent("StoreCreated", { name }),
  storeEvent("StoreRenamed", { name }),
  storeEvent("AisleCreated", { aisleId: id, name }),
  storeEvent("AisleRenamed", { aisleId: id, name }),
  storeEvent("AislesReordered", { aisleIds: Schema.Array(Schema.String) }),
  storeEvent("AisleRemoved", { aisleId: id }),
  householdEvent("ItemCreated", { itemId: id, name }),
  householdEvent("ItemRenamed", { itemId: id, name }),
  householdEvent("ItemRemoved", { itemId: id }),
  householdEvent("ItemQuantitySet", { itemId: id, quantity: Quantity }),
  storeEvent("ItemFiled", { itemId: id, filing: Filing }),
  householdEvent("ItemMarkedToBuy", { itemId: id }),
  householdEvent("ItemMarkedNotToBuy", { itemId: id }),
  householdEvent("ItemChecked", { itemId: id }),
  householdEvent("ItemUnchecked", { itemId: id }),
  storeEvent("TripFinished", {}),
  householdEvent("RequestCreated", { requestId: id, name }),
  householdEvent("RequestAccepted", { requestId: id, itemId: id }),
  householdEvent("RequestDeclined", { requestId: id }),
]);
export type Event = Schema.Schema.Type<typeof Event>;
