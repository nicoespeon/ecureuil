import { fold } from "@ecureuil/domain";
import { Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { frequentItems, searchItems } from "./suggestions";

describe("les items fréquents", () => {
  it("classent les items par nombre de sorties dans ce magasin", () => {
    const state = foyer(
      ["Lait", "Pain", "Café"],
      [sortie("costco", ["Pain", "Lait"]), sortie("costco", ["Lait"])],
    );

    expect(names(frequentItems(state, "costco"))).toEqual(["Lait", "Pain"]);
  });

  it("départagent les ex aequo par nom", () => {
    const state = foyer(["Pain", "Café"], [sortie("costco", ["Pain", "Café"])]);

    expect(names(frequentItems(state, "costco"))).toEqual(["Café", "Pain"]);
  });

  it("ignorent les sorties des autres magasins", () => {
    const state = foyer(["Lait", "Pain"], [sortie("maxi", ["Pain"]), sortie("costco", ["Lait"])]);

    expect(names(frequentItems(state, "costco"))).toEqual(["Lait"]);
  });

  it("excluent les items déjà sur la liste ou dans le panier", () => {
    const state = foyer(
      ["Lait", "Pain", "Café"],
      [sortie("costco", ["Lait", "Pain", "Café"])],
      [markToBuy("Lait"), markToBuy("Pain"), check("Pain")],
    );

    expect(names(frequentItems(state, "costco"))).toEqual(["Café"]);
  });

  it("s'arrêtent à 8 items", () => {
    const tenItems = Array.from({ length: 10 }, (_, index) => `Item ${index}`);
    const state = foyer(tenItems, [sortie("costco", tenItems)]);

    expect(frequentItems(state, "costco")).toHaveLength(8);
  });
});

describe("la recherche dans le catalogue", () => {
  const catalogue = foyer(["Crème", "Café", "Œufs", "Petits pois surgelés", "Lait", "Pain"]);

  it.each([
    ["creme", "Crème"],
    ["CAFÉ", "Café"],
    ["oeufs", "Œufs"],
    ["pois", "Petits pois surgelés"],
  ])("« %s » trouve %s, sans tenir compte des accents ni de la casse", (query, name) => {
    expect(names(searchItems(catalogue, query).items)).toEqual([name]);
  });

  it("met d'abord les noms qui commencent par le texte tapé", () => {
    const state = foyer(["Beurre de pain", "Pain", "Pain aux raisins"]);

    expect(names(searchItems(state, "pain").items)).toEqual([
      "Pain",
      "Pain aux raisins",
      "Beurre de pain",
    ]);
  });

  it("propose de créer le texte tapé, sans les espaces autour, quand aucun item n'a ce nom", () => {
    expect(searchItems(catalogue, "  Laitue ").nameToCreate).toBe("Laitue");
  });

  it("propose de créer même quand le texte trouve d'autres items", () => {
    expect(searchItems(catalogue, "lai")).toMatchObject({
      items: [{ name: "Lait" }],
      nameToCreate: "lai",
    });
  });

  it("ne propose pas de créer un item qui existe déjà, aux accents et à la casse près", () => {
    expect(searchItems(catalogue, "creme")).toMatchObject({
      items: [{ name: "Crème" }],
      exactMatch: { name: "Crème" },
      nameToCreate: null,
    });
  });

  it("ne propose rien pour un texte vide", () => {
    expect(searchItems(catalogue, "  ")).toEqual({ items: [], nameToCreate: null });
  });
});

const decode = Schema.decodeUnknownSync(Event);

/** Item ids are their names, so the tests read in names. */
function foyer(
  itemNames: ReadonlyArray<string>,
  sorties: ReadonlyArray<ReadonlyArray<EventFields>> = [],
  gestures: ReadonlyArray<EventFields> = [],
) {
  const fields = [
    { type: "MagasinCreated", magasin: "costco", payload: { name: "Costco" } },
    { type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } },
    ...itemNames.map((name) => ({ type: "ItemCreated", payload: { itemId: name, name } })),
    ...sorties.flat(),
    ...gestures,
  ];
  return fold(
    fields.map((event, index) =>
      decode({
        id: `e${String(index).padStart(3, "0")}`,
        at: index,
        actor: "proprietaire",
        device: "pixel",
        magasin: null,
        ...event,
      }),
    ),
  );
}

type EventFields = { type: string; payload: unknown; magasin?: string };

function sortie(magasin: string, itemIds: ReadonlyArray<string>): ReadonlyArray<EventFields> {
  return [
    ...itemIds.flatMap((itemId) => [markToBuy(itemId), check(itemId)]),
    { type: "SortieFinished", magasin, payload: {} },
  ];
}

function markToBuy(itemId: string) {
  return { type: "ItemMarkedToBuy", payload: { itemId } };
}

function check(itemId: string) {
  return { type: "ItemChecked", payload: { itemId } };
}

function names(items: ReadonlyArray<{ name: string }>) {
  return items.map((item) => item.name);
}
