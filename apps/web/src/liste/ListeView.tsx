import type { ListArticle, Liste } from "@ecureuil/domain";
import { useLayoutEffect, useRef } from "react";
import type { useFoyer } from "../journal/useFoyer";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ArticleRow";
import { ListeSections } from "./ListeSections";
import type { Mode } from "./useMode";

type Actions = Pick<
  ReturnType<typeof useFoyer>,
  "check" | "uncheck" | "setQuantity" | "removeFromList"
> & {
  readonly announce: (message: string) => void;
  readonly openFiche: (articleId: string) => void;
};

export function ListeView({
  liste,
  magasinName,
  mode,
  actions,
}: {
  liste: Liste;
  magasinName: string;
  mode: Mode;
  actions: Actions;
}) {
  const { containerRef, focusNeighborOf } = useFocusNeighborOfLeavingRow();
  const rowActions = {
    setQuantity: actions.setQuantity,
    announce: actions.announce,
    openFiche: actions.openFiche,
    check: (article: ListArticle) => {
      focusNeighborOf(article.id);
      actions.check(article.id);
      actions.announce(`${article.name} dans le panier`);
    },
    uncheck: (article: ListArticle) => {
      focusNeighborOf(article.id);
      actions.uncheck(article.id);
      actions.announce(`${article.name} retiré du panier`);
    },
    removeFromList: (article: ListArticle) => {
      focusNeighborOf(article.id);
      actions.removeFromList(article.id);
      actions.announce(`${article.name} retiré de la liste`);
    },
  };

  return (
    <div ref={containerRef} className="pb-24">
      <ListeSections
        liste={liste}
        magasinName={magasinName}
        toBuyRows={(articles) => <ToBuyRows articles={articles} actions={rowActions} mode={mode} />}
        panierRows={(articles) => (
          <ul>
            {articles.map((article) => (
              <PanierRow key={article.id} article={article} actions={rowActions} mode={mode} />
            ))}
          </ul>
        )}
      />
    </div>
  );
}

/**
 * A row that leaves its place (checked, unchecked, removed) would take the keyboard focus with
 * it: the focus goes to the same control of the next row instead (its box in Courses, its
 * trash in Préparer), or the previous one, without scrolling.
 */
function useFocusNeighborOfLeavingRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const neighborId = useRef<string | undefined>(undefined);

  const rowControls = () => [
    ...(containerRef.current?.querySelectorAll<HTMLElement>("[data-article-id]") ?? []),
  ];

  useLayoutEffect(() => {
    if (neighborId.current === undefined) return;
    const neighbor = rowControls().find(
      (control) => control.dataset.articleId === neighborId.current,
    );
    neighborId.current = undefined;
    neighbor?.focus({ preventScroll: true });
  });

  return {
    containerRef,
    focusNeighborOf: (articleId: string) => {
      const all = rowControls();
      const index = all.findIndex((control) => control.dataset.articleId === articleId);
      neighborId.current = (all[index + 1] ?? all[index - 1])?.dataset.articleId;
    },
  };
}

function ToBuyRows({
  articles,
  actions,
  mode,
}: {
  articles: ReadonlyArray<ListArticle>;
  actions: ToBuyActions;
  mode: Mode;
}) {
  return (
    <ul>
      {articles.map((article) => (
        <ToBuyRow key={article.id} article={article} actions={actions} mode={mode} />
      ))}
    </ul>
  );
}
