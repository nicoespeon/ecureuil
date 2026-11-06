import type { ListItem } from "@ecureuil/domain";
import { type ReactNode, useEffect, useState } from "react";
import { animateMove, moveTransitionName } from "./animateMove";
import type { Mode } from "./useMode";

/** A UI ceiling: the domain allows more, the stepper stops here. */
const MAX_QUANTITY = 10;
const REMOVE_CONFIRMATION_MS = 3000;

export type ToBuyActions = {
  readonly check: (item: ListItem) => void;
  readonly setQuantity: (itemId: string, quantity: number) => void;
  readonly removeFromList: (item: ListItem) => void;
  readonly announce: (message: string) => void;
  readonly openFiche: (itemId: string) => void;
};

export function ToBuyRow({
  item,
  actions,
  mode,
}: {
  item: ListItem;
  actions: ToBuyActions;
  mode: Mode;
}) {
  return mode === "courses" ? (
    <Row
      item={item}
      checkbox={{ checked: false, onToggle: () => actions.check(item) }}
      openFiche={actions.openFiche}
    />
  ) : (
    <Row item={item} openFiche={actions.openFiche}>
      <Stepper item={item} setQuantity={actions.setQuantity} />
      <RemoveButton item={item} actions={actions} />
    </Row>
  );
}

/** Unchecked only in the magasin: at home the panier is read, not touched. */
export function PanierRow({
  item,
  actions,
  mode,
}: {
  item: ListItem;
  actions: { uncheck: (item: ListItem) => void; openFiche: (itemId: string) => void };
  mode: Mode;
}) {
  const checkbox =
    mode === "courses" ? { checked: true, onToggle: () => actions.uncheck(item) } : undefined;
  return <Row item={item} checkbox={checkbox} openFiche={actions.openFiche} />;
}

function Row({
  item,
  checkbox,
  openFiche,
  children,
}: {
  item: ListItem;
  checkbox?: { checked: boolean; onToggle: () => void } | undefined;
  openFiche: (itemId: string) => void;
  /** The controls that edit the item; a row without them reads its quantity as ×N. */
  children?: ReactNode;
}) {
  return (
    <li
      className={`flex min-h-14 items-center gap-1 border-b border-neutral-200 pr-2 ${checkbox ? "" : "pl-4"}`}
      style={{ viewTransitionName: moveTransitionName(item.id) }}
    >
      {checkbox && (
        // Only the box checks: the name opens the item sheet.
        <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
          <input
            type="checkbox"
            aria-label={item.name}
            data-item-id={item.id}
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
          data-fiche-item-id={item.id}
          onClick={() => openFiche(item.id)}
          className="min-h-11 min-w-0 truncate rounded-md text-left focus-visible:outline-2 focus-visible:outline-blue-700"
        >
          {item.name}
        </button>
        {children === undefined && item.quantity > 1 && (
          <span className="ml-1 shrink-0 text-neutral-700">×{item.quantity}</span>
        )}
      </span>
      {children}
    </li>
  );
}

const iconButtonClassName =
  "grid size-11 shrink-0 place-items-center rounded-md text-lg text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:text-neutral-400 disabled:hover:bg-transparent";

export function Stepper({
  item,
  setQuantity,
}: {
  item: ListItem;
  setQuantity: ToBuyActions["setQuantity"];
}) {
  return (
    <fieldset aria-label={`Quantité de ${item.name}`} className="flex shrink-0 items-center">
      <button
        type="button"
        aria-label={`Diminuer la quantité de ${item.name}`}
        disabled={item.quantity <= 1}
        onClick={() => setQuantity(item.id, item.quantity - 1)}
        className={iconButtonClassName}
      >
        −
      </button>
      <span className="w-5 text-center tabular-nums">{item.quantity}</span>
      <button
        type="button"
        aria-label={`Augmenter la quantité de ${item.name}`}
        disabled={item.quantity >= MAX_QUANTITY}
        onClick={() => setQuantity(item.id, item.quantity + 1)}
        className={iconButtonClassName}
      >
        +
      </button>
    </fieldset>
  );
}

function RemoveButton({ item, actions }: { item: ListItem; actions: ToBuyActions }) {
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    if (!confirming) return;
    const timeout = setTimeout(() => setConfirming(false), REMOVE_CONFIRMATION_MS);
    return () => clearTimeout(timeout);
  }, [confirming]);

  return (
    <button
      type="button"
      data-item-id={item.id}
      onClick={() => {
        if (confirming) {
          actions.removeFromList(item);
        } else {
          setConfirming(true);
          actions.announce(`Touchez encore pour retirer ${item.name} de la liste`);
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
          Retirer<span className="sr-only"> {item.name}</span> ?
        </>
      ) : (
        <>
          <TrashIcon />
          <span className="sr-only">Retirer {item.name} de la liste</span>
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
