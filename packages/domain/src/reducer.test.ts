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
    const renamed = event({
      type: "AisleRenamed",
      store: "costco",
      payload: { aisleId: "fruits", name: "Fruits et légumes" },
    });

    const state = fold([
      costco,
      aisle("fruits", "Fruits"),
      aisle("bakery", "Boulangerie"),
      renamed,
    ]);

    expect(state.stores.costco?.aisles).toEqual([
      { id: "fruits", name: "Fruits et légumes" },
      { id: "bakery", name: "Boulangerie" },
    ]);
  });

  it("reorders aisles, keeping unmentioned ones after the given order", () => {
    const reordered = event({
      type: "AislesReordered",
      store: "costco",
      payload: { aisleIds: ["dairy", "ghost", "bakery"] },
    });

    const state = fold([
      costco,
      aisle("fruits", "Fruits"),
      aisle("bakery", "Boulangerie"),
      aisle("dairy", "Laitier"),
      reordered,
    ]);

    expect(state.stores.costco?.aisles.map((a) => a.id)).toEqual(["dairy", "bakery", "fruits"]);
  });

  it("removes an aisle", () => {
    const removed = event({
      type: "AisleRemoved",
      store: "costco",
      payload: { aisleId: "fruits" },
    });

    const state = fold([
      costco,
      aisle("fruits", "Fruits"),
      aisle("bakery", "Boulangerie"),
      removed,
    ]);

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
const filed = (itemId: string, store: string, placement: unknown) =>
  event({ type: "ItemFiled", store, payload: { itemId, placement } });
const inAisle = (aisleId: string) => ({ _tag: "Aisle", aisleId });

describe("catalogue", () => {
  it("creates an item with quantity 1, not to buy, unfiled everywhere", () => {
    expect(fold([milk]).items).toEqual({
      milk: { id: "milk", name: "Lait", quantity: 1, status: "notToBuy", placements: {} },
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

    expect(state.items.milk?.placements).toEqual({
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

    expect(state.items.milk?.placements).toEqual({});
  });

  it("ignores filing under an aisle the store does not have", () => {
    const state = fold([costco, milk, filed("milk", "costco", inAisle("ghost"))]);

    expect(state.items.milk?.placements).toEqual({});
  });

  it("unfiles the items of a removed aisle", () => {
    const removed = event({ type: "AisleRemoved", store: "costco", payload: { aisleId: "dairy" } });

    const state = fold([
      costco,
      aisle("dairy", "Laitier"),
      milk,
      filed("milk", "costco", inAisle("dairy")),
      removed,
    ]);

    expect(state.items.milk?.placements).toEqual({});
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
