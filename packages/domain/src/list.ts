import { Data } from "effect";
import type { Article, State } from "./reducer";

export type ListArticle = { readonly id: string; readonly name: string; readonly quantity: number };

export type Section = Data.TaggedEnum<{
  Rayon: {
    readonly rayonId: string;
    readonly name: string;
    readonly articles: ReadonlyArray<ListArticle>;
  };
  NonClasse: { readonly articles: ReadonlyArray<ListArticle> };
}>;
const Section = Data.taggedEnum<Section>();

/**
 * The list as walked in one magasin: its rayons in order (empty ones skipped), "Non classé"
 * last, "Pas chez X" and the panier apart. Another magasin re-sorts the same articles.
 */
export type Liste = {
  readonly sections: ReadonlyArray<Section>;
  readonly pasVenduIci: ReadonlyArray<ListArticle>;
  readonly panier: ReadonlyArray<ListArticle>;
};

export function listForMagasin(state: State, magasinId: string): Liste {
  const listed = Object.values(state.articles)
    .filter((article) => article.status !== "notToBuy")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const toBuy = listed.filter((article) => article.status === "toBuy");
  const rayonOf = (article: Article) => article.rayonParMagasin[magasinId];
  const rayons = state.magasins[magasinId]?.rayons ?? [];

  const sections: ReadonlyArray<Section> = [
    ...rayons.map((rayon) =>
      Section.Rayon({
        rayonId: rayon.id,
        name: rayon.name,
        articles: toBuy
          .filter((article) => {
            const articleRayon = rayonOf(article);
            return articleRayon?._tag === "Rayon" && articleRayon.rayonId === rayon.id;
          })
          .map(toListArticle),
      }),
    ),
    Section.NonClasse({
      articles: toBuy.filter((article) => rayonOf(article) === undefined).map(toListArticle),
    }),
  ];

  return {
    sections: sections.filter((section) => section.articles.length > 0),
    pasVenduIci: toBuy
      .filter((article) => rayonOf(article)?._tag === "PasVenduIci")
      .map(toListArticle),
    panier: listed.filter((article) => article.status === "inCart").map(toListArticle),
  };
}

/** Units, not rows: "Lait ×3" counts 3, like the item count on the receipt. */
export function unitCount(liste: Liste) {
  const inPanier = units(liste.panier);
  const leftToTake = liste.sections.reduce((count, section) => count + units(section.articles), 0);
  return { inPanier, planned: inPanier + leftToTake };
}

function units(articles: ReadonlyArray<ListArticle>) {
  return articles.reduce((count, article) => count + article.quantity, 0);
}

function toListArticle({ id, name, quantity }: Article): ListArticle {
  return { id, name, quantity };
}
