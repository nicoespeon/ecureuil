import type { ListArticle, Liste } from "@ecureuil/domain";
import { type RefObject, useLayoutEffect, useRef } from "react";
import type { useFoyer } from "../journal/useFoyer";
import { useMessage } from "../message/Message";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ArticleRow";
import { flyToCart } from "./flyToCart";
import { ListeSections } from "./ListeSections";
import { useListeChanges } from "./useListeChanges";
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
  focusWhenEmpty,
}: {
  liste: Liste;
  magasinName: string;
  mode: Mode;
  actions: Actions;
  /** Where the focus goes when the leaving row was the last one. */
  focusWhenEmpty: RefObject<HTMLElement | null>;
}) {
  const { containerRef, focusNeighborOf } = useFocusNeighborOfLeavingRow(focusWhenEmpty);
  const { arrived, checked } = useListeChanges(liste);
  const showMessage = useMessage();
  const rowActions = {
    setQuantity: actions.setQuantity,
    announce: actions.announce,
    openFiche: actions.openFiche,
    check: (article: ListArticle) => {
      flyToCart(boxOf(containerRef.current, article.id));
      focusNeighborOf(article.id);
      actions.check(article.id);
      const othersToBuy = liste.sections.some((section) =>
        section.articles.some((other) => other.id !== article.id),
      );
      actions.announce(
        othersToBuy
          ? `${article.name} dans le panier`
          : `${article.name} dans le panier. Tout est dans le panier !`,
      );
    },
    uncheck: (article: ListArticle) => {
      focusNeighborOf(article.id);
      actions.uncheck(article.id);
      actions.announce(`${article.name} retiré du panier`);
    },
    removeFromList: (article: ListArticle) => {
      focusNeighborOf(article.id);
      actions.removeFromList(article.id);
      showMessage({ icon: "retire", text: `Retiré de la liste : ${article.name}` });
    },
  };

  return (
    <div ref={containerRef} className="pb-24">
      <ListeSections
        liste={liste}
        magasinName={magasinName}
        toBuyRows={(articles) => (
          <ToBuyRows articles={articles} actions={rowActions} mode={mode} arrived={arrived} />
        )}
        panierRows={(articles) => (
          <ul className="pebble-list mx-3">
            {articles.map((article) => (
              <PanierRow
                key={article.id}
                article={article}
                actions={rowActions}
                mode={mode}
                justChecked={checked.has(article.id)}
              />
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
function useFocusNeighborOfLeavingRow(focusWhenEmpty: RefObject<HTMLElement | null>) {
  const containerRef = useRef<HTMLDivElement>(null);
  /** Null once no row is left to take it. */
  const neighborId = useRef<string | null | undefined>(undefined);

  const rowControls = () => [
    ...(containerRef.current?.querySelectorAll<HTMLElement>("[data-article-id]") ?? []),
  ];

  useLayoutEffect(() => {
    if (neighborId.current === undefined) return;
    const neighbor =
      neighborId.current === null
        ? focusWhenEmpty.current
        : rowControls().find((control) => control.dataset.articleId === neighborId.current);
    neighborId.current = undefined;
    neighbor?.focus({ preventScroll: true });
  });

  return {
    containerRef,
    focusNeighborOf: (articleId: string) => {
      const all = rowControls();
      const index = all.findIndex((control) => control.dataset.articleId === articleId);
      neighborId.current = (all[index + 1] ?? all[index - 1])?.dataset.articleId ?? null;
    },
  };
}

function ToBuyRows({
  articles,
  actions,
  mode,
  arrived,
}: {
  articles: ReadonlyArray<ListArticle>;
  actions: ToBuyActions;
  mode: Mode;
  arrived: ReadonlySet<string>;
}) {
  return (
    <ul className="pebble-list mx-3">
      {articles.map((article) => (
        <ToBuyRow
          key={article.id}
          article={article}
          actions={actions}
          mode={mode}
          justArrived={arrived.has(article.id)}
        />
      ))}
    </ul>
  );
}

function boxOf(container: HTMLElement | null, articleId: string) {
  return container?.querySelector<HTMLElement>(`input[data-article-id="${CSS.escape(articleId)}"]`);
}
