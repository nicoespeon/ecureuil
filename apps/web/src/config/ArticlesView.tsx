import type { Magasin, State } from "@ecureuil/domain";
import { useId, useState } from "react";
import { CreateArticleButton } from "../ajout/AddButton";
import { searchArticles } from "../ajout/suggestions";
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
  actions: Pick<ConfigActions, "setArticleRayon" | "createArticle"> & {
    readonly openFiche: (articleId: string) => void;
    readonly announce: (message: string) => void;
  };
}) {
  const searchId = useId();
  const [search, setSearch] = useState("");
  const { shown, exactMatch, nameToCreate } = searchCatalogue(articles, search);

  // A new article has no rayon yet: its sheet opens to sort it in every magasin.
  const create = (name: string) => {
    const articleId = actions.createArticle(name);
    actions.announce(`Au catalogue : ${name}`);
    actions.openFiche(articleId);
  };
  // Like the list's quick add: the exact name, the first result, or a new article.
  const openOrCreate = () => {
    if (search.trim() === "") return;
    const choice = exactMatch ?? shown[0];
    if (choice) actions.openFiche(choice.id);
    else if (nameToCreate !== null) create(nameToCreate);
  };

  return (
    <div className="p-4">
      <form
        className="flex max-w-2xl flex-col gap-1"
        onSubmit={(event) => {
          event.preventDefault();
          openOrCreate();
        }}
      >
        <label htmlFor={searchId} className="text-sm font-extrabold text-neutral-800">
          Rechercher ou créer un article
        </label>
        <input
          id={searchId}
          type="search"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          autoComplete="off"
          enterKeyHint="go"
          className={fieldClassName}
        />
      </form>
      <ul aria-label="Articles" className="pebble-list mt-3 max-w-2xl">
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
            <div className="w-[56%] max-w-64 shrink-0">
              <RayonSelect
                article={article}
                magasin={magasin}
                label={`Rayon de ${article.name}`}
                setArticleRayon={actions.setArticleRayon}
              />
            </div>
          </li>
        ))}
        {nameToCreate !== null && (
          <li>
            <CreateArticleButton name={nameToCreate} create={() => create(nameToCreate)} />
          </li>
        )}
      </ul>
    </div>
  );
}

/** The whole catalogue by name until a search narrows it. */
function searchCatalogue(articles: State["articles"], search: string) {
  const { articles: found, ...result } = searchArticles({ articles }, search);
  if (search.trim() !== "") return { shown: found, ...result };
  return {
    ...result,
    shown: Object.values(articles).sort((a, b) => a.name.localeCompare(b.name, "fr")),
  };
}
