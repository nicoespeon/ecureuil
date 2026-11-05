import type { ListItem } from "@ecureuil/domain";
import { type ReactNode, useEffect, useState } from "react";
import { animateMove, moveTransitionName } from "./animateMove";

/** A UI ceiling: the domain allows more, the stepper stops here. */
const MAX_QUANTITY = 10;
const REMOVE_CONFIRMATION_MS = 3000;

export type ToBuyActions = {
  readonly check: (item: ListItem) => void;
  readonly setQuantity: (itemId: string, quantity: number) => void;
  readonly removeFromList: (item: ListItem) => void;
  readonly announce: (message: string) => void;
};

export function ToBuyRow({ item, actions }: { item: ListItem; actions: ToBuyActions }) {
  return (
    <Row item={item} checked={false} onToggle={() => actions.check(item)}>
      <Stepper item={item} setQuantity={actions.setQuantity} />
      <RemoveButton item={item} actions={actions} />
    </Row>
  );
}

export function PanierRow({
  item,
  uncheck,
}: {
  item: ListItem;
  uncheck: (item: ListItem) => void;
}) {
  return <Row item={item} checked onToggle={() => uncheck(item)} />;
}

function Row({
  item,
  checked,
  onToggle,
  children,
}: {
  item: ListItem;
  checked: boolean;
  onToggle: () => void;
  children?: ReactNode;
}) {
  return (
    <li
      className="flex min-h-14 items-center gap-1 border-b border-neutral-200 pr-2"
      style={{ viewTransitionName: moveTransitionName(item.id) }}
    >
      {/* Only the box checks: the rest of the row is kept for the item sheet. */}
      <label className="grid size-11 shrink-0 cursor-pointer place-items-center">
        <input
          type="checkbox"
          aria-label={item.name}
          data-item-id={item.id}
          checked={checked}
          onChange={() => animateMove(onToggle)}
          className="size-6 cursor-pointer accent-neutral-900"
        />
      </label>
      <span className="min-w-0 flex-1 truncate">
        {item.name}
        {item.quantity > 1 && <span className="ml-1 text-neutral-700">×{item.quantity}</span>}
      </span>
      {children}
    </li>
  );
}

const iconButtonClassName =
  "grid size-11 shrink-0 place-items-center rounded-md text-lg text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 disabled:text-neutral-400 disabled:hover:bg-transparent";

function Stepper({
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

function TrashIcon() {
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
