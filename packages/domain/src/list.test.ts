import { type Actor, Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { expect, it } from "vitest";
import { listForMagasin } from "./list";
import { fold } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

let sequence = 0;

function event(fields: { type: string; payload: unknown; magasin?: string; actor?: Actor }) {
  sequence += 1;
  return decode({
    id: `e${sequence}`,
    at: sequence,
    actor: "owner",
    device: "pixel",
    magasin: null,
    ...fields,
  });
}

const magasin = (id: string, name: string) =>
  event({ type: "MagasinCreated", magasin: id, payload: { name } });
const rayon = (rayonId: string, name: string) =>
  event({ type: "RayonCreated", magasin: "costco", payload: { rayonId, name } });
const item = (itemId: string, name: string) =>
  event({ type: "ItemCreated", payload: { itemId, name } });
const rayonSet = (itemId: string, magasin: string, rayon: unknown) =>
  event({ type: "ItemRayonSet", magasin, payload: { itemId, rayon } });
const inRayon = (rayonId: string) => ({ _tag: "Rayon", rayonId });
const toBuy = (itemId: string) => event({ type: "ItemMarkedToBuy", payload: { itemId } });

const journal = [
  magasin("costco", "Costco"),
  magasin("maxi", "Maxi"),
  rayon("fruits", "Fruits"),
  rayon("bakery", "Boulangerie"),
  rayon("dairy", "Laitier"),
  item("milk", "Lait"),
  item("water", "Eau"),
  item("bread", "Pain"),
  item("chips", "Chips"),
  item("beer", "Bière"),
  item("apples", "Pommes"),
  item("eggs", "Œufs"),
  rayonSet("milk", "costco", inRayon("dairy")),
  rayonSet("water", "costco", inRayon("dairy")),
  rayonSet("eggs", "costco", inRayon("dairy")),
  rayonSet("bread", "costco", inRayon("bakery")),
  rayonSet("apples", "costco", inRayon("fruits")),
  rayonSet("beer", "costco", { _tag: "PasVenduIci" }),
  rayonSet("chips", "maxi", inRayon("m-snacks")),
  event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 2 } }),
  ...["milk", "water", "bread", "chips", "beer", "eggs"].map(toBuy),
  event({ type: "ItemChecked", magasin: "costco", payload: { itemId: "eggs" } }),
];

it("walks the magasin: rayons in order, non classé last, pas vendu ici and panier apart", () => {
  expect(listForMagasin(fold(journal), "costco")).toEqual({
    sections: [
      {
        _tag: "Rayon",
        rayonId: "bakery",
        name: "Boulangerie",
        items: [{ id: "bread", name: "Pain", quantity: 1 }],
      },
      {
        _tag: "Rayon",
        rayonId: "dairy",
        name: "Laitier",
        items: [
          { id: "water", name: "Eau", quantity: 1 },
          { id: "milk", name: "Lait", quantity: 2 },
        ],
      },
      { _tag: "NonClasse", items: [{ id: "chips", name: "Chips", quantity: 1 }] },
    ],
    pasVenduIci: [{ id: "beer", name: "Bière", quantity: 1 }],
    panier: [{ id: "eggs", name: "Œufs", quantity: 1 }],
  });
});

it("re-sorts the same list for another magasin without changing its content", () => {
  expect(listForMagasin(fold(journal), "maxi")).toEqual({
    sections: [
      {
        _tag: "NonClasse",
        items: [
          { id: "beer", name: "Bière", quantity: 1 },
          { id: "chips", name: "Chips", quantity: 1 },
          { id: "water", name: "Eau", quantity: 1 },
          { id: "milk", name: "Lait", quantity: 2 },
          { id: "bread", name: "Pain", quantity: 1 },
        ],
      },
    ],
    pasVenduIci: [],
    panier: [{ id: "eggs", name: "Œufs", quantity: 1 }],
  });
});
