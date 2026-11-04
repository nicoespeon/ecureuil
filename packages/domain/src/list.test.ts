import { type Actor, Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { expect, it } from "vitest";
import { listForStore } from "./list";
import { fold } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

let sequence = 0;

function event(fields: { type: string; payload: unknown; store?: string; actor?: Actor }) {
  sequence += 1;
  return decode({ id: `e${sequence}`, at: sequence, actor: "owner", store: null, ...fields });
}

const store = (id: string, name: string) =>
  event({ type: "StoreCreated", store: id, payload: { name } });
const aisle = (aisleId: string, name: string) =>
  event({ type: "AisleCreated", store: "costco", payload: { aisleId, name } });
const item = (itemId: string, name: string) =>
  event({ type: "ItemCreated", payload: { itemId, name } });
const filed = (itemId: string, store: string, placement: unknown) =>
  event({ type: "ItemFiled", store, payload: { itemId, placement } });
const inAisle = (aisleId: string) => ({ _tag: "Aisle", aisleId });
const toBuy = (itemId: string) => event({ type: "ItemMarkedToBuy", payload: { itemId } });

const journal = [
  store("costco", "Costco"),
  store("maxi", "Maxi"),
  aisle("fruits", "Fruits"),
  aisle("bakery", "Boulangerie"),
  aisle("dairy", "Laitier"),
  item("milk", "Lait"),
  item("water", "Eau"),
  item("bread", "Pain"),
  item("chips", "Chips"),
  item("beer", "Bière"),
  item("apples", "Pommes"),
  item("eggs", "Œufs"),
  filed("milk", "costco", inAisle("dairy")),
  filed("water", "costco", inAisle("dairy")),
  filed("eggs", "costco", inAisle("dairy")),
  filed("bread", "costco", inAisle("bakery")),
  filed("apples", "costco", inAisle("fruits")),
  filed("beer", "costco", { _tag: "NotSoldHere" }),
  filed("chips", "maxi", inAisle("m-snacks")),
  event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 2 } }),
  ...["milk", "water", "bread", "chips", "beer", "eggs"].map(toBuy),
  event({ type: "ItemChecked", store: "costco", payload: { itemId: "eggs" } }),
];

it("walks the store: aisles in order, unfiled last, not sold and cart apart", () => {
  expect(listForStore(fold(journal), "costco")).toEqual({
    sections: [
      {
        _tag: "Aisle",
        aisleId: "bakery",
        name: "Boulangerie",
        items: [{ id: "bread", name: "Pain", quantity: 1 }],
      },
      {
        _tag: "Aisle",
        aisleId: "dairy",
        name: "Laitier",
        items: [
          { id: "water", name: "Eau", quantity: 1 },
          { id: "milk", name: "Lait", quantity: 2 },
        ],
      },
      { _tag: "Unfiled", items: [{ id: "chips", name: "Chips", quantity: 1 }] },
    ],
    notSoldHere: [{ id: "beer", name: "Bière", quantity: 1 }],
    cart: [{ id: "eggs", name: "Œufs", quantity: 1 }],
  });
});

it("re-sorts the same list for another store without changing its content", () => {
  const list = listForStore(fold(journal), "maxi");

  expect(list.sections.flatMap((section) => section.items.map((i) => i.id)).sort()).toEqual([
    "beer",
    "bread",
    "chips",
    "milk",
    "water",
  ]);
});
