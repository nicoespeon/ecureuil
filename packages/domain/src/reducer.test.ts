import { type Actor, Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { fold, initialState } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

let sequence = 0;

// Builds a valid journal entry; `at` follows creation order unless overridden.
function event(fields: {
  type: string;
  payload: unknown;
  store?: string;
  at?: number;
  actor?: Actor;
  id?: string;
}) {
  sequence += 1;
  return decode({ id: `e${sequence}`, at: sequence, actor: "owner", store: null, ...fields });
}

const costco = event({ type: "StoreCreated", store: "costco", payload: { name: "Costco" } });
const aisle = (aisleId: string, name: string, store = "costco") =>
  event({ type: "AisleCreated", store, payload: { aisleId, name } });

it("folds an empty journal into the initial state", () => {
  expect(fold([])).toEqual(initialState);
});

describe("stores and aisles", () => {
  it("creates a store with no aisles", () => {
    expect(fold([costco]).stores).toEqual({
      costco: { id: "costco", name: "Costco", aisles: [] },
    });
  });

  it("renames a store", () => {
    const renamed = event({
      type: "StoreRenamed",
      store: "costco",
      payload: { name: "Costco Anjou" },
    });

    expect(fold([costco, renamed]).stores.costco).toMatchObject({ name: "Costco Anjou" });
  });

  it("adds aisles in creation order and renames them", () => {
    const fruits = aisle("fruits", "Fruits");
    const bakery = aisle("bakery", "Boulangerie");
    const renamed = event({
      type: "AisleRenamed",
      store: "costco",
      payload: { aisleId: "fruits", name: "Fruits et légumes" },
    });

    const state = fold([costco, fruits, bakery, renamed]);

    expect(state.stores.costco?.aisles).toEqual([
      { id: "fruits", name: "Fruits et légumes" },
      { id: "bakery", name: "Boulangerie" },
    ]);
  });

  it("reorders aisles, keeping unmentioned ones after the given order", () => {
    const aisles = [
      aisle("fruits", "Fruits"),
      aisle("bakery", "Boulangerie"),
      aisle("dairy", "Laitier"),
    ];
    const reordered = event({
      type: "AislesReordered",
      store: "costco",
      payload: { aisleIds: ["dairy", "ghost", "bakery"] },
    });

    const state = fold([costco, ...aisles, reordered]);

    expect(state.stores.costco?.aisles.map((a) => a.id)).toEqual(["dairy", "bakery", "fruits"]);
  });

  it("removes an aisle", () => {
    const aisles = [aisle("fruits", "Fruits"), aisle("bakery", "Boulangerie")];
    const removed = event({
      type: "AisleRemoved",
      store: "costco",
      payload: { aisleId: "fruits" },
    });

    const state = fold([costco, ...aisles, removed]);

    expect(state.stores.costco?.aisles).toEqual([{ id: "bakery", name: "Boulangerie" }]);
  });

  it("keeps each store's aisles apart", () => {
    const maxi = event({ type: "StoreCreated", store: "maxi", payload: { name: "Maxi" } });

    const state = fold([
      costco,
      maxi,
      aisle("c-bakery", "Boulangerie"),
      aisle("m-bakery", "Boulangerie", "maxi"),
    ]);

    expect(state.stores.maxi?.aisles).toEqual([{ id: "m-bakery", name: "Boulangerie" }]);
  });
});

const milk = event({ type: "ItemCreated", payload: { itemId: "milk", name: "Lait" } });
const filed = (itemId: string, store: string, filing: unknown) =>
  event({ type: "ItemFiled", store, payload: { itemId, filing } });
const inAisle = (aisleId: string) => ({ _tag: "Aisle", aisleId });

describe("catalogue", () => {
  it("creates an item with quantity 1, not to buy, unfiled everywhere", () => {
    expect(fold([milk]).items).toEqual({
      milk: { id: "milk", name: "Lait", quantity: 1, status: "notToBuy", filings: {} },
    });
  });

  it("renames an item", () => {
    const renamed = event({ type: "ItemRenamed", payload: { itemId: "milk", name: "Lait 2 %" } });

    expect(fold([milk, renamed]).items.milk).toMatchObject({ name: "Lait 2 %" });
  });

  it("sets the quantity", () => {
    const set = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 3 } });

    expect(fold([milk, set]).items.milk).toMatchObject({ quantity: 3 });
  });

  it("removes an item from the catalogue", () => {
    const removed = event({ type: "ItemRemoved", payload: { itemId: "milk" } });

    expect(fold([milk, removed]).items).toEqual({});
  });

  it("files an item under an aisle in one store and as not sold in another", () => {
    const maxi = event({ type: "StoreCreated", store: "maxi", payload: { name: "Maxi" } });

    const state = fold([
      costco,
      maxi,
      aisle("dairy", "Laitier"),
      milk,
      filed("milk", "costco", inAisle("dairy")),
      filed("milk", "maxi", { _tag: "NotSoldHere" }),
    ]);

    expect(state.items.milk?.filings).toEqual({
      costco: { _tag: "Aisle", aisleId: "dairy" },
      maxi: { _tag: "NotSoldHere" },
    });
  });

  it("unfiles an item", () => {
    const state = fold([
      costco,
      aisle("dairy", "Laitier"),
      milk,
      filed("milk", "costco", inAisle("dairy")),
      filed("milk", "costco", { _tag: "Unfiled" }),
    ]);

    expect(state.items.milk?.filings).toEqual({});
  });

  it("ignores filing under an aisle the store does not have", () => {
    const state = fold([costco, milk, filed("milk", "costco", inAisle("ghost"))]);

    expect(state.items.milk?.filings).toEqual({});
  });

  it("unfiles the items of a removed aisle", () => {
    const dairy = aisle("dairy", "Laitier");
    const filedInDairy = filed("milk", "costco", inAisle("dairy"));
    const removed = event({ type: "AisleRemoved", store: "costco", payload: { aisleId: "dairy" } });

    const state = fold([costco, dairy, milk, filedInDairy, removed]);

    expect(state.items.milk?.filings).toEqual({});
  });
});

const bread = event({ type: "ItemCreated", payload: { itemId: "bread", name: "Pain" } });
const toBuy = (itemId: string) => event({ type: "ItemMarkedToBuy", payload: { itemId } });
const notToBuy = (itemId: string) => event({ type: "ItemMarkedNotToBuy", payload: { itemId } });
const checked = (itemId: string) =>
  event({ type: "ItemChecked", store: "costco", payload: { itemId } });
const unchecked = (itemId: string) =>
  event({ type: "ItemUnchecked", store: "costco", payload: { itemId } });

describe("list, cart and trips", () => {
  it("marks an item to buy", () => {
    expect(fold([milk, toBuy("milk")]).items.milk).toMatchObject({ status: "toBuy" });
  });

  it("marks an item not to buy, even when it sits in the cart", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), notToBuy("milk")]);

    expect(state.items.milk).toMatchObject({ status: "notToBuy" });
  });

  it("checks a listed item into the cart", () => {
    expect(fold([milk, toBuy("milk"), checked("milk")]).items.milk).toMatchObject({
      status: "inCart",
    });
  });

  it("ignores checking an item that is not on the list", () => {
    expect(fold([milk, checked("milk")]).items.milk).toMatchObject({ status: "notToBuy" });
  });

  it("unchecks an item back onto the list", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), unchecked("milk")]);

    expect(state.items.milk).toMatchObject({ status: "toBuy" });
  });

  it("finishing a trip records the cart as purchases; unchecked items stay to buy", () => {
    const quantity = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 2 } });
    const finished = event({
      id: "trip-1",
      at: 1762282800000,
      type: "TripFinished",
      store: "costco",
      payload: {},
    });

    const state = fold([
      costco,
      milk,
      bread,
      toBuy("milk"),
      toBuy("bread"),
      quantity,
      checked("milk"),
      finished,
    ]);

    expect(state).toMatchObject({
      items: { milk: { status: "notToBuy", quantity: 2 }, bread: { status: "toBuy" } },
      trips: [
        {
          id: "trip-1",
          store: "costco",
          at: 1762282800000,
          purchases: [{ itemId: "milk", quantity: 2 }],
        },
      ],
    });
  });
});

const chips = event({ type: "ItemCreated", payload: { itemId: "chips", name: "Chips" } });
const requested = event({
  type: "RequestCreated",
  actor: "guest",
  payload: { requestId: "r1", name: "Chips" },
});
const accepted = () =>
  event({ type: "RequestAccepted", payload: { requestId: "r1", itemId: "chips" } });
const declined = () => event({ type: "RequestDeclined", payload: { requestId: "r1" } });

describe("requests", () => {
  it("records a guest request as pending", () => {
    expect(fold([requested]).requests).toEqual({
      r1: { id: "r1", name: "Chips", requestedAt: requested.at, status: { _tag: "Pending" } },
    });
  });

  it("accepting a request puts the chosen item on the list", () => {
    expect(fold([requested, chips, accepted()])).toMatchObject({
      requests: { r1: { status: { _tag: "Accepted", itemId: "chips" } } },
      items: { chips: { status: "toBuy" } },
    });
  });

  it("declining a request leaves the list untouched", () => {
    expect(fold([requested, chips, declined()])).toMatchObject({
      requests: { r1: { status: { _tag: "Declined" } } },
      items: { chips: { status: "notToBuy" } },
    });
  });

  it.each([
    ["accepted", [accepted(), declined()], "Accepted", "toBuy"],
    ["declined", [declined(), accepted()], "Declined", "notToBuy"],
  ] as const)("the first arbitration wins: %s then the other", (_, arbitrations, tag, status) => {
    expect(fold([requested, chips, ...arbitrations])).toMatchObject({
      requests: { r1: { status: { _tag: tag } } },
      items: { chips: { status } },
    });
  });
});

describe("conflicts: the journal replays by timestamp, then by event id", () => {
  const quantity = (fields: { id: string; at: number; quantity: number }) =>
    event({
      ...fields,
      type: "ItemQuantitySet",
      payload: { itemId: "milk", quantity: fields.quantity },
    });

  it("quantity is last-write-wins by timestamp, whatever the arrival order", () => {
    const later = quantity({ id: "q-later", at: 200, quantity: 2 });
    const earlier = quantity({ id: "q-earlier", at: 100, quantity: 5 });

    expect(fold([milk, later, earlier]).items.milk).toMatchObject({ quantity: 2 });
  });

  it.each([["a then b"], ["b then a"]])(
    "quantity on the same timestamp: the greater event id wins (%s)",
    (order) => {
      const a = quantity({ id: "q-a", at: 100, quantity: 3 });
      const b = quantity({ id: "q-b", at: 100, quantity: 7 });

      expect(fold([milk, ...(order === "a then b" ? [a, b] : [b, a])]).items.milk).toMatchObject({
        quantity: 7,
      });
    },
  );

  it("a duplicated event is applied once", () => {
    const finished = event({ id: "trip-dup", type: "TripFinished", store: "costco", payload: {} });

    const state = fold([costco, milk, toBuy("milk"), checked("milk"), finished, finished]);

    expect(state.trips).toHaveLength(1);
  });

  it("checking twice, from two devices, is one check", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), checked("milk")]);

    expect(state.items.milk).toMatchObject({ status: "inCart" });
  });

  it.each([
    ["the edit is older than the removal", 2, 3],
    ["the edit is newer than the removal", 3, 2],
  ])("a removed item stays removed when an edit arrives late and %s", (_, editAt, removalAt) => {
    const created = event({ at: 1, type: "ItemCreated", payload: { itemId: "i", name: "X" } });
    const removed = event({ at: removalAt, type: "ItemRemoved", payload: { itemId: "i" } });
    const renamed = event({ at: editAt, type: "ItemRenamed", payload: { itemId: "i", name: "Y" } });

    expect(fold([created, removed, renamed]).items).toEqual({});
  });

  it("the first arbitration by timestamp wins, whatever the arrival order", () => {
    const lateDecline = event({ at: 300, type: "RequestDeclined", payload: { requestId: "r1" } });
    const earlyAccept = event({
      at: 200,
      type: "RequestAccepted",
      payload: { requestId: "r1", itemId: "chips" },
    });

    expect(fold([requested, chips, lateDecline, earlyAccept]).requests.r1?.status).toEqual({
      _tag: "Accepted",
      itemId: "chips",
    });
  });
});
