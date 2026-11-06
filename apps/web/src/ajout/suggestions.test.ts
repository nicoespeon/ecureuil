import { fold } from "@ecureuil/domain";
import { Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { frequentArticles, searchArticles } from "./suggestions";

describe("les articles fréquents", () => {
  it("classent les articles par nombre de sorties dans ce magasin", () => {
    const state = foyer(
      ["Lait", "Pain", "Café"],
      [sortie("costco", ["Pain", "Lait"]), sortie("costco", ["Lait"])],
    );

    expect(names(frequentArticles(state, "costco"))).toEqual(["Lait", "Pain"]);
  });

  it("départagent les ex aequo par nom", () => {
    const state = foyer(["Pain", "Café"], [sortie("costco", ["Pain", "Café"])]);

    expect(names(frequentArticles(state, "costco"))).toEqual(["Café", "Pain"]);
  });

  it("ignorent les sorties des autres magasins", () => {
    const state = foyer(["Lait", "Pain"], [sortie("maxi", ["Pain"]), sortie("costco", ["Lait"])]);

    expect(names(frequentArticles(state, "costco"))).toEqual(["Lait"]);
  });

  it("excluent les articles déjà sur la liste ou dans le panier", () => {
    const state = foyer(
      ["Lait", "Pain", "Café"],
      [sortie("costco", ["Lait", "Pain", "Café"])],
      [markToBuy("Lait"), markToBuy("Pain"), check("Pain")],
    );

    expect(names(frequentArticles(state, "costco"))).toEqual(["Café"]);
  });

  it("s'arrêtent à 8 articles", () => {
    const tenArticles = Array.from({ length: 10 }, (_, index) => `Article ${index}`);
    const state = foyer(tenArticles, [sortie("costco", tenArticles)]);

    expect(frequentArticles(state, "costco")).toHaveLength(8);
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
    expect(names(searchArticles(catalogue, query).articles)).toEqual([name]);
  });

  it("met d'abord les noms qui commencent par le texte tapé", () => {
    const state = foyer(["Beurre de pain", "Pain", "Pain aux raisins"]);

    expect(names(searchArticles(state, "pain").articles)).toEqual([
      "Pain",
      "Pain aux raisins",
      "Beurre de pain",
    ]);
  });

  it("propose de créer le texte tapé, sans les espaces autour, quand aucun article n'a ce nom", () => {
    expect(searchArticles(catalogue, "  Laitue ").nameToCreate).toBe("Laitue");
  });

  it("propose de créer même quand le texte trouve d'autres articles", () => {
    expect(searchArticles(catalogue, "lai")).toMatchObject({
      articles: [{ name: "Lait" }],
      nameToCreate: "lai",
    });
  });

  it("ne propose pas de créer un article qui existe déjà, aux accents et à la casse près", () => {
    expect(searchArticles(catalogue, "creme")).toMatchObject({
      articles: [{ name: "Crème" }],
      exactMatch: { name: "Crème" },
      nameToCreate: null,
    });
  });

  it("ne propose rien pour un texte vide", () => {
    expect(searchArticles(catalogue, "  ")).toEqual({ articles: [], nameToCreate: null });
  });
});

const decode = Schema.decodeUnknownSync(Event);

/** Article ids are their names, so the tests read in names. */
function foyer(
  articleNames: ReadonlyArray<string>,
  sorties: ReadonlyArray<ReadonlyArray<EventFields>> = [],
  gestures: ReadonlyArray<EventFields> = [],
) {
  const fields = [
    { type: "MagasinCreated", magasin: "costco", payload: { name: "Costco" } },
    { type: "MagasinCreated", magasin: "maxi", payload: { name: "Maxi" } },
    ...articleNames.map((name) => ({ type: "ArticleCreated", payload: { articleId: name, name } })),
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

function sortie(magasin: string, articleIds: ReadonlyArray<string>): ReadonlyArray<EventFields> {
  return [
    ...articleIds.flatMap((articleId) => [markToBuy(articleId), check(articleId)]),
    { type: "SortieFinished", magasin, payload: {} },
  ];
}

function markToBuy(articleId: string) {
  return { type: "ArticleMarkedToBuy", payload: { articleId } };
}

function check(articleId: string) {
  return { type: "ArticleChecked", payload: { articleId } };
}

function names(articles: ReadonlyArray<{ name: string }>) {
  return articles.map((article) => article.name);
}
