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
