import type { ListArticle } from "@ecureuil/domain";
import { type ReactNode, useEffect, useState } from "react";
import { animateMove, moveTransitionName } from "./animateMove";
import type { Mode } from "./useMode";

/** A UI ceiling: the domain allows more, the stepper stops here. */
const MAX_QUANTITY = 10;
const REMOVE_CONFIRMATION_MS = 3000;

export type ToBuyActions = {
  readonly check: (article: ListArticle) => void;
  readonly setQuantity: (articleId: string, quantity: number) => void;
  readonly removeFromList: (article: ListArticle) => void;
  readonly announce: (message: string) => void;
  readonly openFiche: (articleId: string) => void;
};

export function ToBuyRow({
  article,
  actions,
  mode,
}: {
  article: ListArticle;
  actions: ToBuyActions;
  mode: Mode;
}) {
  return mode === "courses" ? (
    <Row
      article={article}
      checkbox={{ checked: false, onToggle: () => actions.check(article) }}
      showsQuantity
      openFiche={actions.openFiche}
    />
  ) : (
    <Row article={article} showsQuantity={false} openFiche={actions.openFiche}>
      <Stepper article={article} setQuantity={actions.setQuantity} />
      <RemoveButton article={article} actions={actions} />
    </Row>
  );
}

/** Unchecked only in the magasin: at home the panier is read, not touched. */
export function PanierRow({
  article,
  actions,
  mode,
}: {
  article: ListArticle;
  actions: { uncheck: (article: ListArticle) => void; openFiche: (articleId: string) => void };
  mode: Mode;
}) {
  const checkbox =
    mode === "courses" ? { checked: true, onToggle: () => actions.uncheck(article) } : undefined;
  return <Row article={article} checkbox={checkbox} showsQuantity openFiche={actions.openFiche} />;
}

function Row({
  article,
  checkbox,
  showsQuantity,
  openFiche,
  children,
}: {
  article: ListArticle;
  checkbox?: { checked: boolean; onToggle: () => void } | undefined;
  /** ×N next to the name, where no stepper already says it. */
  showsQuantity: boolean;
  openFiche: (articleId: string) => void;
  children?: ReactNode;
}) {
  return (
    <li
      className={`flex min-h-14 items-center gap-1 border-b border-neutral-200 pr-2 ${checkbox ? "" : "pl-4"}`}
      style={{ viewTransitionName: moveTransitionName(article.id) }}
    >
      {checkbox && (
        // Only the box checks: the name opens the article sheet.
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            type="checkbox"
            aria-label={article.name}
            data-article-id={article.id}
            checked={checkbox.checked}
            onChange={() => animateMove(checkbox.onToggle)}
            className="size-6 cursor-pointer accent-neutral-900"
          />
        </label>
      )}
      <span className="flex min-w-0 flex-1 items-center">
        <button
          type="button"
          aria-haspopup="dialog"
          data-fiche-article-id={article.id}
          onClick={() => openFiche(article.id)}
          className="min-h-11 min-w-0 truncate rounded-md text-left focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {article.name}
        </button>
        {showsQuantity && article.quantity > 1 && (
          <span className="ml-1 shrink-0 text-neutral-700">×{article.quantity}</span>
        )}
      </span>
      {children}
    </li>
  );
}

const iconButtonClassName =
  "grid size-11 shrink-0 place-items-center rounded-md text-lg text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:text-neutral-400 disabled:hover:bg-transparent";

export function Stepper({
  article,
  setQuantity,
}: {
  article: ListArticle;
  setQuantity: ToBuyActions["setQuantity"];
}) {
  return (
    <fieldset aria-label={`Quantité de ${article.name}`} className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`Diminuer la quantité de ${article.name}`}
        disabled={article.quantity <= 1}
        onClick={() => setQuantity(article.id, article.quantity - 1)}
        className={iconButtonClassName}
      >
        −
      </button>
      <span className="w-5 text-center tabular-nums">{article.quantity}</span>
      <button
        type="button"
        aria-label={`Augmenter la quantité de ${article.name}`}
        disabled={article.quantity >= MAX_QUANTITY}
        onClick={() => setQuantity(article.id, article.quantity + 1)}
        className={iconButtonClassName}
      >
        +
      </button>
    </fieldset>
  );
}

function RemoveButton({ article, actions }: { article: ListArticle; actions: ToBuyActions }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), REMOVE_CONFIRMATION_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  return (
    <button
      type="button"
      data-article-id={article.id}
      onClick={() => {
        if (confirming) {
          actions.removeFromList(article);
        } else {
          setConfirming(true);
          actions.announce(`Touchez encore pour retirer ${article.name} de la liste`);
        }
      }}
      className={
        confirming
          ? "h-11 shrink-0 rounded-md bg-red-700 px-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
          : iconButtonClassName
      }
    >
      {confirming ? (
        <>
          Retirer<span className="sr-only"> {article.name}</span> ?
        </>
      ) : (
        <>
          <TrashIcon />
          <span className="sr-only">Retirer {article.name} de la liste</span>
        </>
      )}
    </button>
  );
}

export function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}
