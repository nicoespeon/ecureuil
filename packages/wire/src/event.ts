import { Schema } from "effect";

// The two secret links of the household: the owner arbitrates, the guest requests.
export const Actor = Schema.Literals(["owner", "guest"]);
export type Actor = Schema.Schema.Type<typeof Actor>;

// Where an item sits in one store. Absent = unfiled ("Non classé").
export const Placement = Schema.Union([
  Schema.TaggedStruct("Aisle", { aisleId: Schema.String }),
  Schema.TaggedStruct("NotSoldHere", {}),
  Schema.TaggedStruct("Unfiled", {}),
]);
export type Placement = Schema.Schema.Type<typeof Placement>;

const Quantity = Schema.Int.pipe(Schema.check(Schema.isGreaterThan(0)));

// Envelope shared by every journal entry, readable without knowing the payloads:
// `at` is epoch milliseconds, `store` the store the actor was in (when any).
const envelope = {
  id: Schema.String,
  at: Schema.Int,
  actor: Actor,
};

function householdEvent<const T extends string, const P extends Schema.Struct.Fields>(
  type: T,
  payload: P,
) {
  return Schema.Struct({
    ...envelope,
    store: Schema.NullOr(Schema.String),
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
    store: Schema.String,
    type: Schema.Literal(type),
    payload: Schema.Struct(payload),
  });
}

const name = Schema.NonEmptyString;

export const Event = Schema.Union([
  storeEvent("StoreCreated", { name }),
  storeEvent("StoreRenamed", { name }),
  storeEvent("AisleCreated", { aisleId: Schema.String, name }),
  storeEvent("AisleRenamed", { aisleId: Schema.String, name }),
  storeEvent("AislesReordered", { aisleIds: Schema.Array(Schema.String) }),
  storeEvent("AisleRemoved", { aisleId: Schema.String }),
  householdEvent("ItemCreated", { itemId: Schema.String, name }),
  householdEvent("ItemRenamed", { itemId: Schema.String, name }),
  householdEvent("ItemRemoved", { itemId: Schema.String }),
  householdEvent("ItemQuantitySet", { itemId: Schema.String, quantity: Quantity }),
  storeEvent("ItemFiled", { itemId: Schema.String, placement: Placement }),
  householdEvent("ItemMarkedToBuy", { itemId: Schema.String }),
  householdEvent("ItemMarkedNotToBuy", { itemId: Schema.String }),
  householdEvent("ItemChecked", { itemId: Schema.String }),
  householdEvent("ItemUnchecked", { itemId: Schema.String }),
  storeEvent("TripFinished", {}),
  householdEvent("RequestCreated", { requestId: Schema.String, name }),
  householdEvent("RequestAccepted", { requestId: Schema.String, itemId: Schema.String }),
  householdEvent("RequestDeclined", { requestId: Schema.String }),
]);
export type Event = Schema.Schema.Type<typeof Event>;
