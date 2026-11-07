import type { ListArticle, Liste } from "@ecureuil/domain";
import { useEffect, useRef } from "react";

/**
 * What changed since the list last rendered: the articles that just arrived on it, and those
 * just put in the panier. Nothing on the first render: opening the app is no news.
 */
export function useListeChanges(liste: Liste) {
  const previous = useRef<Liste>(undefined);
  useEffect(() => {
    previous.current = liste;
  });

  const before = previous.current;
  if (!before) return { arrived: none, checked: none };
  const toBuyBefore = idsOf(toBuy(before));
  const listedBefore = new Set([...toBuyBefore, ...idsOf(before.panier)]);
  return {
    arrived: idsOf(toBuy(liste).filter((article) => !listedBefore.has(article.id))),
    checked: idsOf(liste.panier.filter((article) => toBuyBefore.has(article.id))),
  };
}

const none: ReadonlySet<string> = new Set();

function toBuy(liste: Liste) {
  return [...liste.sections.flatMap((section) => section.articles), ...liste.pasVenduIci];
}

function idsOf(articles: ReadonlyArray<ListArticle>): ReadonlySet<string> {
  return new Set(articles.map((article) => article.id));
}
