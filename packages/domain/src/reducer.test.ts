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

const milk = event({ type: "ArticleCreated", payload: { articleId: "milk", name: "Lait" } });
const rayonSet = (articleId: string, magasin: string, rayon: unknown) =>
  event({ type: "ArticleRayonSet", magasin, payload: { articleId, rayon } });
const inRayon = (rayonId: string) => ({ _tag: "Rayon", rayonId });

describe("catalogue", () => {
  it("crée un article en quantité 1, pas à acheter, non classé partout", () => {
    expect(fold([milk]).articles).toEqual({
      milk: { id: "milk", name: "Lait", quantity: 1, status: "notToBuy", rayonParMagasin: {} },
    });
  });

  it("renomme un article", () => {
    const renamed = event({
      type: "ArticleRenamed",
      payload: { articleId: "milk", name: "Lait 2 %" },
    });

    expect(fold([milk, renamed]).articles.milk).toMatchObject({ name: "Lait 2 %" });
  });

  it("fixe la quantité", () => {
    const set = event({ type: "ArticleQuantitySet", payload: { articleId: "milk", quantity: 3 } });

    expect(fold([milk, set]).articles.milk).toMatchObject({ quantity: 3 });
  });

  it("retire un article du catalogue", () => {
    const removed = event({ type: "ArticleRemoved", payload: { articleId: "milk" } });

    expect(fold([milk, removed]).articles).toEqual({});
  });

  it("range un article dans un rayon d'un magasin et en pas vendu ici dans un autre", () => {
    const maxi = event({ type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } });

    const state = fold([
      costco,
      maxi,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "maxi", { _tag: "PasVenduIci" }),
    ]);

    expect(state.articles.milk?.rayonParMagasin).toEqual({
      costco: { _tag: "Rayon", rayonId: "dairy" },
      maxi: { _tag: "PasVenduIci" },
    });
  });

  it("remet un article en non classé", () => {
    const state = fold([
      costco,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "costco", { _tag: "NonClasse" }),
    ]);

    expect(state.articles.milk?.rayonParMagasin).toEqual({});
  });

  it("ignore un rayon que le magasin n'a pas", () => {
    const state = fold([costco, milk, rayonSet("milk", "costco", inRayon("ghost"))]);

    expect(state.articles.milk?.rayonParMagasin).toEqual({});
  });

  it("remet en non classé les articles d'un rayon supprimé", () => {
    const dairy = rayon("dairy", "Laitier");
    const milkInDairy = rayonSet("milk", "costco", inRayon("dairy"));
    const removed = event({
      type: "RayonRemoved",
      magasin: "costco",
      payload: { rayonId: "dairy" },
    });

    const state = fold([costco, dairy, milk, milkInDairy, removed]);

    expect(state.articles.milk?.rayonParMagasin).toEqual({});
  });

  it("retire un magasin, et le rayon de ses articles dans ce magasin seulement", () => {
    const maxi = event({ type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } });
    const removed = event({ type: "MagasinRemoved", magasin: "costco", payload: {} });

    const state = fold([
      costco,
      maxi,
      rayon("dairy", "Laitier"),
      milk,
      rayonSet("milk", "costco", inRayon("dairy")),
      rayonSet("milk", "maxi", { _tag: "PasVenduIci" }),
      removed,
    ]);

    expect(Object.keys(state.magasins)).toEqual(["maxi"]);
    expect(state.articles.milk?.rayonParMagasin).toEqual({ maxi: { _tag: "PasVenduIci" } });
  });
});

const bread = event({ type: "ArticleCreated", payload: { articleId: "bread", name: "Pain" } });
const toBuy = (articleId: string) => event({ type: "ArticleMarkedToBuy", payload: { articleId } });
const notToBuy = (articleId: string) =>
  event({ type: "ArticleMarkedNotToBuy", payload: { articleId } });
const checked = (articleId: string) =>
  event({ type: "ArticleChecked", magasin: "costco", payload: { articleId } });
const unchecked = (articleId: string) =>
  event({ type: "ArticleUnchecked", magasin: "costco", payload: { articleId } });

describe("liste, panier et sorties", () => {
  it("met un article à acheter", () => {
    expect(fold([milk, toBuy("milk")]).articles.milk).toMatchObject({ status: "toBuy" });
  });

  it("retire un article de la liste, même quand il est dans le panier", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), notToBuy("milk")]);

    expect(state.articles.milk).toMatchObject({ status: "notToBuy" });
  });

  it("cocher un article de la liste le met dans le panier", () => {
    expect(fold([milk, toBuy("milk"), checked("milk")]).articles.milk).toMatchObject({
      status: "inCart",
    });
  });

  it("ignore un article coché qui n'est pas sur la liste", () => {
    expect(fold([milk, checked("milk")]).articles.milk).toMatchObject({ status: "notToBuy" });
  });

  it("décocher un article le remet sur la liste", () => {
    const state = fold([milk, toBuy("milk"), checked("milk"), unchecked("milk")]);

    expect(state.articles.milk).toMatchObject({ status: "toBuy" });
  });

  it("terminer une sortie enregistre le panier en achats ; les articles non cochés restent à acheter", () => {
    const quantity = event({
      type: "ArticleQuantitySet",
      payload: { articleId: "milk", quantity: 2 },
    });
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
      articles: { milk: { status: "notToBuy", quantity: 2 }, bread: { status: "toBuy" } },
      sorties: [
        {
          id: "sortie-1",
          magasin: "costco",
          at: 1762282800000,
          achats: [{ articleId: "milk", quantity: 2 }],
        },
      ],
    });
  });
});

const chips = event({ type: "ArticleCreated", payload: { articleId: "chips", name: "Chips" } });
const requested = event({
  type: "DemandeCreated",
  actor: "invite",
  payload: { demandeId: "r1", name: "Chips" },
});
const accepted = () =>
  event({ type: "DemandeAccepted", payload: { demandeId: "r1", articleId: "chips" } });
const refused = () => event({ type: "DemandeRefused", payload: { demandeId: "r1" } });
const withdrawn = () =>
  event({ type: "DemandeWithdrawn", actor: "invite", payload: { demandeId: "r1" } });

describe("demandes", () => {
  it("enregistre la demande de l'invite en attente", () => {
    expect(fold([requested]).demandes).toEqual({
      r1: { id: "r1", name: "Chips", requestedAt: requested.at, status: { _tag: "Pending" } },
    });
  });

  it("accepter une demande met l'article choisi sur la liste", () => {
    expect(fold([requested, chips, accepted()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Accepted", articleId: "chips" } } },
      articles: { chips: { status: "toBuy" } },
    });
  });

  it("refuser une demande laisse la liste intacte", () => {
    expect(fold([requested, chips, refused()])).toMatchObject({
      demandes: { r1: { status: { _tag: "Refused" } } },
      articles: { chips: { status: "notToBuy" } },
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
      articles: { chips: { status } },
    });
  });
});

describe("conflits : le journal rejoue par timestamp, puis par id d'événement", () => {
  const quantity = (fields: { id: string; at: number; quantity: number }) =>
    event({
      ...fields,
      type: "ArticleQuantitySet",
      payload: { articleId: "milk", quantity: fields.quantity },
    });

  it("pour la quantité, la dernière écriture par timestamp gagne, quel que soit l'ordre d'arrivée", () => {
    const later = quantity({ id: "q-later", at: 200, quantity: 2 });
    const earlier = quantity({ id: "q-earlier", at: 100, quantity: 5 });

    expect(fold([milk, later, earlier]).articles.milk).toMatchObject({ quantity: 2 });
  });

  it.each([["a puis b"], ["b puis a"]])(
    "quantité au même timestamp : le plus grand id d'événement gagne (%s)",
    (order) => {
      const a = quantity({ id: "q-a", at: 100, quantity: 3 });
      const b = quantity({ id: "q-b", at: 100, quantity: 7 });

      expect(fold([milk, ...(order === "a puis b" ? [a, b] : [b, a])]).articles.milk).toMatchObject(
        {
          quantity: 7,
        },
      );
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

    expect(state.articles.milk).toMatchObject({ status: "inCart" });
  });

  it.each([
    ["la modification est plus ancienne que le retrait", 2, 3],
    ["la modification est plus récente que le retrait", 3, 2],
  ])(
    "un article retiré le reste quand une modification arrive en retard et que %s",
    (_, editAt, removalAt) => {
      const created = event({
        at: 1,
        type: "ArticleCreated",
        payload: { articleId: "i", name: "X" },
      });
      const removed = event({ at: removalAt, type: "ArticleRemoved", payload: { articleId: "i" } });
      const renamed = event({
        at: editAt,
        type: "ArticleRenamed",
        payload: { articleId: "i", name: "Y" },
      });

      expect(fold([created, removed, renamed]).articles).toEqual({});
    },
  );

  it("le premier arbitrage par timestamp gagne, quel que soit l'ordre d'arrivée", () => {
    const lateDecline = event({ at: 300, type: "DemandeRefused", payload: { demandeId: "r1" } });
    const earlyAccept = event({
      at: 200,
      type: "DemandeAccepted",
      payload: { demandeId: "r1", articleId: "chips" },
    });

    expect(fold([requested, chips, lateDecline, earlyAccept]).demandes.r1?.status).toEqual({
      _tag: "Accepted",
      articleId: "chips",
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

  it("accepter une demande pour un article inexistant la laisse en attente", () => {
    expect(fold([requested, accepted()]).demandes.r1?.status).toEqual({ _tag: "Pending" });
  });

  it("ignore un rayon dans un magasin inexistant", () => {
    const state = fold([milk, rayonSet("milk", "ghost", { _tag: "PasVenduIci" })]);

    expect(state.articles.milk?.rayonParMagasin).toEqual({});
  });

  it("une seconde création du même article est ignorée", () => {
    const again = event({
      type: "ArticleCreated",
      payload: { articleId: "milk", name: "Lait entier" },
    });
    const quantity = event({
      type: "ArticleQuantitySet",
      payload: { articleId: "milk", quantity: 4 },
    });

    expect(fold([milk, quantity, again]).articles.milk).toMatchObject({
      name: "Lait",
      quantity: 4,
    });
  });
});
