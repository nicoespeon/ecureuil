import type { Article, Magasin } from "@ecureuil/domain";
import { fieldClassName } from "./classNames";
import { currentRayonChoice, NON_CLASSE, PAS_VENDU_ICI, rayonChoiceOf } from "./rayonChoice";

/** A native select: the phone's own picker, and type-ahead on a keyboard. */
export function RayonSelect({
  id,
  article,
  magasin,
  label,
  setArticleRayon,
}: {
  id?: string;
  article: Article;
  magasin: Magasin;
  label: string;
  setArticleRayon: (magasinId: string, placement: { articleId: string; choice: string }) => void;
}) {
  return (
    <select
      id={id}
      aria-label={label}
      value={currentRayonChoice(article, magasin.id)}
      onChange={(event) =>
        setArticleRayon(magasin.id, { articleId: article.id, choice: event.currentTarget.value })
      }
      className={`${fieldClassName} clay-select pr-10`}
    >
      {magasin.rayons.map((rayon) => (
        <option key={rayon.id} value={rayonChoiceOf(rayon.id)}>
          {rayon.name}
        </option>
      ))}
      <option value={NON_CLASSE}>Non classé</option>
      <option value={PAS_VENDU_ICI}>Pas chez {magasin.name}</option>
    </select>
  );
}
