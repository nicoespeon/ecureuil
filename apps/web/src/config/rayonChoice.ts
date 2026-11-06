import type { Article } from "@ecureuil/domain";
import { ArticleRayon } from "@ecureuil/wire";

/**
 * The value of a rayon `<select>`: one of the magasin's rayons, « Non classé » or « Pas chez X ».
 * Rayon ids are prefixed so none can pass for the two others.
 */
export const NON_CLASSE = "NonClasse";
export const PAS_VENDU_ICI = "PasVenduIci";
const RAYON_PREFIX = "rayon:";

export function rayonChoiceOf(rayonId: string) {
  return `${RAYON_PREFIX}${rayonId}`;
}

export function currentRayonChoice(article: Article, magasinId: string) {
  const articleRayon = article.rayonParMagasin[magasinId];
  if (articleRayon === undefined) return NON_CLASSE;
  return articleRayon._tag === "Rayon" ? rayonChoiceOf(articleRayon.rayonId) : PAS_VENDU_ICI;
}

export function articleRayonOf(choice: string) {
  if (choice === PAS_VENDU_ICI) return ArticleRayon.cases.PasVenduIci.make({});
  if (choice.startsWith(RAYON_PREFIX))
    return ArticleRayon.cases.Rayon.make({ rayonId: choice.slice(RAYON_PREFIX.length) });
  return ArticleRayon.cases.NonClasse.make({});
}
