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
  magasin?: string;
  at?: number;
  actor?: Actor;
  id?: string;
}) {
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

const costco = event({ type: "MagasinCreated", magasin: "costco", payload: { name: "Costco" } });
const rayon = (rayonId: string, name: string, magasin = "costco") =>
  event({ type: "RayonCreated", magasin, payload: { rayonId, name } });

it("folds an empty journal into the initial state", () => {
  expect(fold([])).toEqual(initialState);
});

describe("magasins and rayons", () => {
  it("creates a magasin with no rayons", () => {
    expect(fold([costco]).magasins).toEqual({
      costco: { id: "costco", name: "Costco", rayons: [] },
    });
  });

  it("renames a magasin", () => {
    const renamed = event({
      type: "MagasinRenamed",
      magasin: "costco",
      payload: { name: "Costco Anjou" },
    });

    expect(fold([costco, renamed]).magasins.costco).toMatchObject({ name: "Costco Anjou" });
  });

  it("adds rayons in creation order and renames them", () => {
    const fruits = rayon("fruits", "Fruits");
    const bakery = rayon("bakery", "Boulangerie");
    const renamed = event({
      type: "RayonRenamed",
      magasin: "costco",
      payload: { rayonId: "fruits", name: "Fruits et légumes" },
    });

    const state = fold([costco, fruits, bakery, renamed]);

    expect(state.magasins.costco?.rayons).toEqual([
      { id: "fruits", name: "Fruits et légumes" },
      { id: "bakery", name: "Boulangerie" },
    ]);
  });

  it("reorders rayons, keeping unmentioned ones after the given order", () => {
    const rayons = [
      rayon("fruits", "Fruits"),
      rayon("bakery", "Boulangerie"),
      rayon("dairy", "Laitier"),
    ];
    const reordered = event({
      type: "RayonsReordered",
      magasin: "costco",
      payload: { rayonIds: ["dairy", "ghost", "bakery"] },
    });

    const state = fold([costco, ...rayons, reordered]);

    expect(state.magasins.costco?.rayons.map((a) => a.id)).toEqual(["dairy", "bakery", "fruits"]);
  });

  it("removes a rayon", () => {
    const rayons = [rayon("fruits", "Fruits"), rayon("bakery", "Boulangerie")];
    const removed = event({
      type: "RayonRemoved",
      magasin: "costco",
      payload: { rayonId: "fruits" },
    });

    const state = fold([costco, ...rayons, removed]);

    expect(state.magasins.costco?.rayons).toEqual([{ id: "bakery", name: "Boulangerie" }]);
  });

  it("keeps each magasin's rayons apart", () => {
    const maxi = event({ type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } });

    const state = fold([
      costco,
      maxi,
      rayon("c-bakery", "Boulangerie"),
      rayon("m-bakery", "Boulangerie", "maxi"),
    ]);

    expect(state.magasins.maxi?.rayons).toEqual([{ id: "m-bakery", name: "Boulangerie" }]);
  });
});

const milk = event({ type: "ItemCreated", payload: { itemId: "milk", name: "Lait" } });
const rayonSet = (itemId: string, magasin: string, rayon: unknown) =>
  event({ type: "ItemRayonSet", magasin, payload: { itemId, rayon } });
const inRayon = (rayonId: string) => ({ _tag: "Rayon", rayonId });

describe("catalogue", () => {
  it("creates an item with quantity 1, not to buy, non classé everywhere", () => {
    expect(fold([milk]).items).toEqual({
      milk: { id: "milk", name: "Lait", quantity: 1, status: "notToBuy", rayonParMagasin: {} },
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

  it("sets an item's rayon in one magasin and pas vendu ici in another", () => {
    const maxi = event({ type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } });

    const state = fold([
      costco,
      maxi,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "maxi", { _tag: "PasVenduIci" }),
    ]);

    expect(state.items.milk?.rayonParMagasin).toEqual({
      costco: { _tag: "Rayon", rayonId: "dairy" },
      maxi: { _tag: "PasVenduIci" },
    });
  });

  it("sets an item back to non classé", () => {
    const state = fold([
      costco,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "costco", { _tag: "NonClasse" }),
    ]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("ignores a rayon the magasin does not have", () => {
    const state = fold([costco, milk, rayonSet("milk", "costco", inRayon("ghost"))]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("sets the items of a removed rayon back to non classé", () => {
    const dairy = rayon("dairy", "Laitier");
    const milkInDairy = rayonSet("milk", "costco", inRayon("dairy"));
    const removed = event({
      type: "RayonRemoved",
      magasin: "costco",
      payload: { rayonId: "dairy" },
    });

    const state = fold([costco, dairy, milk, milkInDairy, removed]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });
});

const bread = event({ type: "ItemCreated", payload: { itemId: "bread", name: "Pain" } });
const toBuy = (itemId: string) => event({ type: "ItemMarkedToBuy", payload: { itemId } });
const notToBuy = (itemId: string) => event({ type: "ItemMarkedNotToBuy", payload: { itemId } });
const checked = (itemId: string) =>
  event({ type: "ItemChecked", magasin: "costco", payload: { itemId } });
const unchecked = (itemId: string) =>
  event({ type: "ItemUnchecked", magasin: "costco", payload: { itemId } });

describe("list, panier and sorties", () => {
  it("marks an item to buy", () => {
    expect(fold([milk, toBuy("milk")]).items.milk).toMatchObject({ status: "toBuy" });
  });

  it("marks an item not to buy, even when it sits in the panier", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), notToBuy("milk")]);

    expect(state.items.milk).toMatchObject({ status: "notToBuy" });
  });

  it("checks a listed item into the panier", () => {
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

  it("finishing a sortie records the panier as achats; unchecked items stay to buy", () => {
    const quantity = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 2 } });
    const finished = event({
      id: "sortie-1",
      at: 1762282800000,
      type: "SortieFinished",
      magasin: "costco",
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
      sorties: [
        {
          id: "sortie-1",
          magasin: "costco",
          at: 1762282800000,
          achats: [{ itemId: "milk", quantity: 2 }],
        },
      ],
    });
  });
});

const chips = event({ type: "ItemCreated", payload: { itemId: "chips", name: "Chips" } });
const requested = event({
  type: "DemandeCreated",
  actor: "invite",
  payload: { demandeId: "r1", name: "Chips" },
});
const accepted = () =>
  event({ type: "DemandeAccepted", payload: { demandeId: "r1", itemId: "chips" } });
const refused = () => event({ type: "DemandeRefused", payload: { demandeId: "r1" } });

describe("demandes", () => {
  it("records a guest demande as pending", () => {
    expect(fold([requested]).demandes).toEqual({
      r1: { id: "r1", name: "Chips", requestedAt: requested.at, status: { _tag: "Pending" } },
    });
  });

  it("accepting a demande puts the chosen item on the list", () => {
    expect(fold([requested, chips, accepted()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Accepted", itemId: "chips" } } },
      items: { chips: { status: "toBuy" } },
    });
  });

  it("refusing a demande leaves the list untouched", () => {
    expect(fold([requested, chips, refused()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Refused" } } },
      items: { chips: { status: "notToBuy" } },
    });
  });

  it.each([
    ["accepted", [accepted(), refused()], "Accepted", "toBuy"],
    ["refused", [refused(), accepted()], "Refused", "notToBuy"],
  ] as const)("the first arbitration wins: %s then the other", (_, arbitrations, tag, status) => {
    expect(fold([requested, chips, ...arbitrations])).toMatchObject({
      demandes: { r1: { status: { _tag: tag } } },
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
    const finished = event({
      id: "sortie-dup",
      type: "SortieFinished",
      magasin: "costco",
      payload: {},
    });

    const state = fold([costco, milk, toBuy("milk"), checked("milk"), finished, finished]);

    expect(state.sorties).toHaveLength(1);
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
    const lateDecline = event({ at: 300, type: "DemandeRefused", payload: { demandeId: "r1" } });
    const earlyAccept = event({
      at: 200,
      type: "DemandeAccepted",
      payload: { demandeId: "r1", itemId: "chips" },
    });

    expect(fold([requested, chips, lateDecline, earlyAccept]).demandes.r1?.status).toEqual({
      _tag: "Accepted",
      itemId: "chips",
    });
  });
});

describe("review fixes", () => {
  it("reordering with a repeated id keeps each rayon once", () => {
    const rayons = [rayon("fruits", "Fruits"), rayon("bakery", "Boulangerie")];
    const reordered = event({
      type: "RayonsReordered",
      magasin: "costco",
      payload: { rayonIds: ["bakery", "bakery", "fruits"] },
    });

    const state = fold([costco, ...rayons, reordered]);

    expect(state.magasins.costco?.rayons.map((a) => a.id)).toEqual(["bakery", "fruits"]);
  });

  it("accepting a demande for an item that does not exist leaves it pending", () => {
    expect(fold([requested, accepted()]).demandes.r1?.status).toEqual({ _tag: "Pending" });
  });

  it("ignores a rayon in a magasin that does not exist", () => {
    const state = fold([milk, rayonSet("milk", "ghost", { _tag: "PasVenduIci" })]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("a second creation of the same item is ignored", () => {
    const again = event({ type: "ItemCreated", payload: { itemId: "milk", name: "Lait entier" } });
    const quantity = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 4 } });

    expect(fold([milk, quantity, again]).items.milk).toMatchObject({ name: "Lait", quantity: 4 });
  });
});
