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

it("le fold d'un journal vide donne l'état initial", () => {
  expect(fold([])).toEqual(initialState);
});

describe("magasins et rayons", () => {
  it("crée un magasin sans rayons", () => {
    expect(fold([costco]).magasins).toEqual({
      costco: { id: "costco", name: "Costco", rayons: [] },
    });
  });

  it("renomme un magasin", () => {
    const renamed = event({
      type: "MagasinRenamed",
      magasin: "costco",
      payload: { name: "Costco Anjou" },
    });

    expect(fold([costco, renamed]).magasins.costco).toMatchObject({ name: "Costco Anjou" });
  });

  it("ajoute les rayons dans l'ordre de création et les renomme", () => {
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

  it("réordonne les rayons, ceux qui ne sont pas mentionnés à la suite", () => {
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

  it("supprime un rayon", () => {
    const rayons = [rayon("fruits", "Fruits"), rayon("bakery", "Boulangerie")];
    const removed = event({
      type: "RayonRemoved",
      magasin: "costco",
      payload: { rayonId: "fruits" },
    });

    const state = fold([costco, ...rayons, removed]);

    expect(state.magasins.costco?.rayons).toEqual([{ id: "bakery", name: "Boulangerie" }]);
  });

  it("garde les rayons de chaque magasin séparés", () => {
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
  it("crée un item en quantité 1, pas à acheter, non classé partout", () => {
    expect(fold([milk]).items).toEqual({
      milk: { id: "milk", name: "Lait", quantity: 1, status: "notToBuy", rayonParMagasin: {} },
    });
  });

  it("renomme un item", () => {
    const renamed = event({ type: "ItemRenamed", payload: { itemId: "milk", name: "Lait 2 %" } });

    expect(fold([milk, renamed]).items.milk).toMatchObject({ name: "Lait 2 %" });
  });

  it("fixe la quantité", () => {
    const set = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 3 } });

    expect(fold([milk, set]).items.milk).toMatchObject({ quantity: 3 });
  });

  it("retire un item du catalogue", () => {
    const removed = event({ type: "ItemRemoved", payload: { itemId: "milk" } });

    expect(fold([milk, removed]).items).toEqual({});
  });

  it("range un item dans un rayon d'un magasin et en pas vendu ici dans un autre", () => {
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

  it("remet un item en non classé", () => {
    const state = fold([
      costco,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "costco", { _tag: "NonClasse" }),
    ]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("ignore un rayon que le magasin n'a pas", () => {
    const state = fold([costco, milk, rayonSet("milk", "costco", inRayon("ghost"))]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("remet en non classé les items d'un rayon supprimé", () => {
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

describe("liste, panier et sorties", () => {
  it("met un item à acheter", () => {
    expect(fold([milk, toBuy("milk")]).items.milk).toMatchObject({ status: "toBuy" });
  });

  it("retire un item de la liste, même quand il est dans le panier", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), notToBuy("milk")]);

    expect(state.items.milk).toMatchObject({ status: "notToBuy" });
  });

  it("cocher un item de la liste le met dans le panier", () => {
    expect(fold([milk, toBuy("milk"), checked("milk")]).items.milk).toMatchObject({
      status: "inCart",
    });
  });

  it("ignore un item coché qui n'est pas sur la liste", () => {
    expect(fold([milk, checked("milk")]).items.milk).toMatchObject({ status: "notToBuy" });
  });

  it("décocher un item le remet sur la liste", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), unchecked("milk")]);

    expect(state.items.milk).toMatchObject({ status: "toBuy" });
  });

  it("terminer une sortie enregistre le panier en achats ; les items non cochés restent à acheter", () => {
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
const withdrawn = () =>
  event({ type: "DemandeWithdrawn", actor: "invite", payload: { demandeId: "r1" } });

describe("demandes", () => {
  it("enregistre la demande de l'invite en attente", () => {
    expect(fold([requested]).demandes).toEqual({
      r1: { id: "r1", name: "Chips", requestedAt: requested.at, status: { _tag: "Pending" } },
    });
  });

  it("accepter une demande met l'item choisi sur la liste", () => {
    expect(fold([requested, chips, accepted()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Accepted", itemId: "chips" } } },
      items: { chips: { status: "toBuy" } },
    });
  });

  it("refuser une demande laisse la liste intacte", () => {
    expect(fold([requested, chips, refused()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Refused" } } },
      items: { chips: { status: "notToBuy" } },
    });
  });

  it("l'invité retire une demande en attente", () => {
    expect(fold([requested, withdrawn()]).demandes.r1?.status).toEqual({ _tag: "Withdrawn" });
  });

  it.each([
    ["acceptée", [accepted(), refused()], "Accepted", "toBuy"],
    ["refusée", [refused(), accepted()], "Refused", "notToBuy"],
    ["acceptée", [accepted(), withdrawn()], "Accepted", "toBuy"],
    ["retirée", [withdrawn(), accepted()], "Withdrawn", "notToBuy"],
    ["retirée", [withdrawn(), refused()], "Withdrawn", "notToBuy"],
  ] as const)("le premier arbitrage gagne : %s puis l'autre", (_, arbitrations, tag, status) => {
    expect(fold([requested, chips, ...arbitrations])).toMatchObject({
      demandes: { r1: { status: { _tag: tag } } },
      items: { chips: { status } },
    });
  });
});

describe("conflits : le journal rejoue par timestamp, puis par id d'événement", () => {
  const quantity = (fields: { id: string; at: number; quantity: number }) =>
    event({
      ...fields,
      type: "ItemQuantitySet",
      payload: { itemId: "milk", quantity: fields.quantity },
    });

  it("pour la quantité, la dernière écriture par timestamp gagne, quel que soit l'ordre d'arrivée", () => {
    const later = quantity({ id: "q-later", at: 200, quantity: 2 });
    const earlier = quantity({ id: "q-earlier", at: 100, quantity: 5 });

    expect(fold([milk, later, earlier]).items.milk).toMatchObject({ quantity: 2 });
  });

  it.each([["a puis b"], ["b puis a"]])(
    "quantité au même timestamp : le plus grand id d'événement gagne (%s)",
    (order) => {
      const a = quantity({ id: "q-a", at: 100, quantity: 3 });
      const b = quantity({ id: "q-b", at: 100, quantity: 7 });

      expect(fold([milk, ...(order === "a puis b" ? [a, b] : [b, a])]).items.milk).toMatchObject({
        quantity: 7,
      });
    },
  );

  it("un événement dupliqué s'applique une seule fois", () => {
    const finished = event({
      id: "sortie-dup",
      type: "SortieFinished",
      magasin: "costco",
      payload: {},
    });

    const state = fold([costco, milk, toBuy("milk"), checked("milk"), finished, finished]);

    expect(state.sorties).toHaveLength(1);
  });

  it("cocher deux fois, depuis deux devices, compte pour une fois", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), checked("milk")]);

    expect(state.items.milk).toMatchObject({ status: "inCart" });
  });

  it.each([
    ["la modification est plus ancienne que le retrait", 2, 3],
    ["la modification est plus récente que le retrait", 3, 2],
  ])(
    "un item retiré le reste quand une modification arrive en retard et que %s",
    (_, editAt, removalAt) => {
      const created = event({ at: 1, type: "ItemCreated", payload: { itemId: "i", name: "X" } });
      const removed = event({ at: removalAt, type: "ItemRemoved", payload: { itemId: "i" } });
      const renamed = event({
        at: editAt,
        type: "ItemRenamed",
        payload: { itemId: "i", name: "Y" },
      });

      expect(fold([created, removed, renamed]).items).toEqual({});
    },
  );

  it("le premier arbitrage par timestamp gagne, quel que soit l'ordre d'arrivée", () => {
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

describe("cas relevés en revue", () => {
  it("réordonner avec un id répété garde chaque rayon une seule fois", () => {
    const rayons = [rayon("fruits", "Fruits"), rayon("bakery", "Boulangerie")];
    const reordered = event({
      type: "RayonsReordered",
      magasin: "costco",
      payload: { rayonIds: ["bakery", "bakery", "fruits"] },
    });

    const state = fold([costco, ...rayons, reordered]);

    expect(state.magasins.costco?.rayons.map((a) => a.id)).toEqual(["bakery", "fruits"]);
  });

  it("accepter une demande pour un item inexistant la laisse en attente", () => {
    expect(fold([requested, accepted()]).demandes.r1?.status).toEqual({ _tag: "Pending" });
  });

  it("ignore un rayon dans un magasin inexistant", () => {
    const state = fold([milk, rayonSet("milk", "ghost", { _tag: "PasVenduIci" })]);

    expect(state.items.milk?.rayonParMagasin).toEqual({});
  });

  it("une seconde création du même item est ignorée", () => {
    const again = event({ type: "ItemCreated", payload: { itemId: "milk", name: "Lait entier" } });
    const quantity = event({ type: "ItemQuantitySet", payload: { itemId: "milk", quantity: 4 } });

    expect(fold([milk, quantity, again]).items.milk).toMatchObject({ name: "Lait", quantity: 4 });
  });
});
