import { type Actor, Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { expect, it } from "vitest";
import { listForMagasin, unitCount } from "./list";
import { fold } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

let sequence = 0;

function event(fields: { type: string; payload: unknown; magasin?: string; actor?: Actor }) {
  sequence += 1;
  return decode({
    id: `e${sequence}`,
    at: sequence,
    actor: "proprietaire",
    device: "pixel",
    magasin: null,
    ...fields,
  });
}

const magasin = (id: string, name: string) =>
  event({ type: "MagasinCreated", magasin: id, payload: { name } });
const rayon = (rayonId: string, name: string) =>
  event({ type: "RayonCreated", magasin: "costco", payload: { rayonId, name } });
const article = (articleId: string, name: string) =>
  event({ type: "ArticleCreated", payload: { articleId, name } });
const rayonSet = (articleId: string, magasin: string, rayon: unknown) =>
  event({ type: "ArticleRayonSet", magasin, payload: { articleId, rayon } });
const inRayon = (rayonId: string) => ({ _tag: "Rayon", rayonId });
const toBuy = (articleId: string) => event({ type: "ArticleMarkedToBuy", payload: { articleId } });

const journal = [
  magasin("costco", "Costco"),
  magasin("maxi", "Maxi"),
  rayon("fruits", "Fruits"),
  rayon("bakery", "Boulangerie"),
  rayon("dairy", "Laitier"),
  article("milk", "Lait"),
  article("water", "Eau"),
  article("bread", "Pain"),
  article("chips", "Chips"),
  article("beer", "Bière"),
  article("apples", "Pommes"),
  article("eggs", "Œufs"),
  rayonSet("milk", "costco", inRayon("dairy")),
  rayonSet("water", "costco", inRayon("dairy")),
  rayonSet("eggs", "costco", inRayon("dairy")),
  rayonSet("bread", "costco", inRayon("bakery")),
  rayonSet("apples", "costco", inRayon("fruits")),
  rayonSet("beer", "costco", { _tag: "PasVenduIci" }),
  rayonSet("chips", "maxi", inRayon("m-snacks")),
  event({ type: "ArticleQuantitySet", payload: { articleId: "milk", quantity: 2 } }),
  ...["milk", "water", "bread", "chips", "beer", "eggs"].map(toBuy),
  event({ type: "ArticleChecked", magasin: "costco", payload: { articleId: "eggs" } }),
];

it("parcourt le magasin : rayons dans l'ordre, non classé en dernier, pas vendu ici et panier à part", () => {
  expect(listForMagasin(fold(journal), "costco")).toEqual({
    sections: [
      {
        _tag: "Rayon",
        rayonId: "bakery",
        name: "Boulangerie",
        articles: [{ id: "bread", name: "Pain", quantity: 1 }],
      },
      {
        _tag: "Rayon",
        rayonId: "dairy",
        name: "Laitier",
        articles: [
          { id: "water", name: "Eau", quantity: 1 },
          { id: "milk", name: "Lait", quantity: 2 },
        ],
      },
      { _tag: "NonClasse", articles: [{ id: "chips", name: "Chips", quantity: 1 }] },
    ],
    pasVenduIci: [{ id: "beer", name: "Bière", quantity: 1 }],
    panier: [{ id: "eggs", name: "Œufs", quantity: 1 }],
  });
});

it("retrie la même liste pour un autre magasin sans en changer le contenu", () => {
  expect(listForMagasin(fold(journal), "maxi")).toEqual({
    sections: [
      {
        _tag: "NonClasse",
        articles: [
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

it("compte les unités dans le panier et prévues, sans ce qui n'est pas vendu ici", () => {
  const withQuantities = [
    ...journal,
    event({ type: "ArticleQuantitySet", payload: { articleId: "eggs", quantity: 3 } }),
    event({ type: "ArticleQuantitySet", payload: { articleId: "beer", quantity: 6 } }),
  ];

  expect(unitCount(listForMagasin(fold(withQuantities), "costco"))).toEqual({
    inPanier: 3,
    planned: 8,
  });
});
