import type { Article, State } from "@ecureuil/domain";

const MAX_FREQUENT_ARTICLES = 8;

/**
 * The articles bought most often in this magasin, by number of sorties, that are not on the list
 * yet: what the empty search field suggests.
 */
export function frequentArticles(state: State, magasinId: string) {
  const sortiesCount = state.sorties
    .filter((sortie) => sortie.magasin === magasinId)
    .flatMap((sortie) => sortie.achats.map((achat) => achat.articleId))
    .reduce(
      (counts, articleId) => counts.set(articleId, (counts.get(articleId) ?? 0) + 1),
      new Map<string, number>(),
    );

  return [...sortiesCount]
    .flatMap(([articleId, count]) => {
      const article = state.articles[articleId];
      return article?.status === "notToBuy" ? [{ article, count }] : [];
    })
    .sort((a, b) => b.count - a.count || byName(a.article, b.article))
    .slice(0, MAX_FREQUENT_ARTICLES)
    .map(({ article }) => article);
}

/**
 * The catalogue articles whose name contains the query, ignoring accents and case, those starting
 * with it first. `nameToCreate` is the query when no article bears that exact name.
 */
export function searchArticles({ articles }: Pick<State, "articles">, query: string) {
  const name = query.trim();
  const needle = searchable(name);
  if (needle === "") return { articles: [], exactMatch: undefined, nameToCreate: null };

  const found = Object.values(articles)
    .map((article) => ({ article, key: searchable(article.name) }))
    .filter(({ key }) => key.includes(needle))
    .sort(
      (a, b) =>
        Number(b.key.startsWith(needle)) - Number(a.key.startsWith(needle)) ||
        byName(a.article, b.article),
    );
  const exactMatch = found.find(({ key }) => key === needle)?.article;
  return {
    articles: found.map(({ article }) => article),
    exactMatch,
    nameToCreate: exactMatch ? null : name,
  };
}

function searchable(text: string) {
  return text
    .toLocaleLowerCase("fr")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
}

function byName(a: Article, b: Article) {
  return a.name.localeCompare(b.name, "fr");
}
