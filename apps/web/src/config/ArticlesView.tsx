import type { Article, Magasin, State } from "@ecureuil/domain";
import { useId, useState } from "react";
import { fieldClassName } from "./classNames";
import type { ConfigActions } from "./configActions";
import { RayonSelect } from "./RayonSelect";

export function ArticlesView({
  magasin,
  articles,
  actions,
}: {
  magasin: Magasin;
  articles: State["articles"];
  actions: Pick<ConfigActions, "setArticleRayon"> & {
    readonly openFiche: (articleId: string) => void;
  };
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const shown = Object.values(articles)
    .filter((article) => matches(article, search))
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));

  return (
    <div className="p-4">
      <div className="flex max-w-2xl flex-col gap-1">
        <label htmlFor={searchId} className="text-sm font-extrabold text-neutral-800">
          Rechercher un article
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          autoComplete="off"
          className={fieldClassName}
        />
      </div>
      <ul aria-label="Articles" className="list-card mx-0! mt-3 max-w-2xl">
        {shown.map((article) => (
          <li
            key={article.id}
            className="flex items-center gap-2 border-b-2 border-neutral-100 px-2 py-1 last:border-b-0"
          >
            <button
              type="button"
              aria-haspopup="dialog"
              data-fiche-article-id={article.id}
              onClick={() => actions.openFiche(article.id)}
              className="min-h-11 min-w-0 flex-1 rounded-md px-1 text-left text-base font-bold break-words underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              {article.name}
            </button>
            <div className="w-[48%] max-w-64 shrink-0">
              <RayonSelect
                article={article}
                magasin={magasin}
                label={`Rayon de ${article.name}`}
                setArticleRayon={actions.setArticleRayon}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function matches(article: Article, search: string) {
  return comparable(article.name).includes(comparable(search.trim()));
}

/** « rape » finds « Fromage râpé », « oeufs » finds « Œufs ». */
function comparable(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("fr")
    .replaceAll("œ", "oe")
    .replaceAll("æ", "ae");
}
