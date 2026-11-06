import type { Liste, ListItem } from "@ecureuil/domain";
import { useLayoutEffect, useRef } from "react";
import type { useFoyer } from "../journal/useFoyer";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ItemRow";
import { ListeSections } from "./ListeSections";

type Actions = Pick<
  ReturnType<typeof useFoyer>,
  "check" | "uncheck" | "setQuantity" | "removeFromList"
> & {
  readonly announce: (message: string) => void;
  readonly openFiche: (itemId: string) => void;
};

export function ListeView({
  liste,
  magasinName,
  actions,
}: {
  liste: Liste;
  magasinName: string;
  actions: Actions;
}) {
  const { containerRef, focusNeighborOf } = useFocusNeighborOfLeavingRow();
  const rowActions = {
    setQuantity: actions.setQuantity,
    announce: actions.announce,
    openFiche: actions.openFiche,
    check: (item: ListItem) => {
      focusNeighborOf(item.id);
      actions.check(item.id);
      actions.announce(`${item.name} dans le panier`);
    },
    uncheck: (item: ListItem) => {
      focusNeighborOf(item.id);
      actions.uncheck(item.id);
      actions.announce(`${item.name} retiré du panier`);
    },
    removeFromList: (item: ListItem) => {
      focusNeighborOf(item.id);
      actions.removeFromList(item.id);
      actions.announce(`${item.name} retiré de la liste`);
    },
  };

  return (
    <div ref={containerRef} className="pb-24">
      <ListeSections
        liste={liste}
        magasinName={magasinName}
        toBuyRows={(items) => <ToBuyRows items={items} actions={rowActions} />}
        panierRows={(items) => (
          <ul>
            {items.map((item) => (
              <PanierRow key={item.id} item={item} actions={rowActions} />
            ))}
          </ul>
        )}
      />
    </div>
  );
}

/**
 * A row that leaves its place (checked, unchecked, removed) would take the keyboard focus with
 * it: the focus goes to the next row instead, or the previous one, without scrolling.
 */
function useFocusNeighborOfLeavingRow() {
  const containerRef = useRef<HTMLDivElement>(null);
  const neighborId = useRef<string | undefined>(undefined);

  const checkboxes = () => [
    ...(containerRef.current?.querySelectorAll<HTMLInputElement>("input[data-item-id]") ?? []),
  ];

  useLayoutEffect(() => {
    if (neighborId.current === undefined) return;
    const neighbor = checkboxes().find(
      (checkbox) => checkbox.dataset.itemId === neighborId.current,
    );
    neighborId.current = undefined;
    neighbor?.focus({ preventScroll: true });
  });

  return {
    containerRef,
    focusNeighborOf: (itemId: string) => {
      const all = checkboxes();
      const index = all.findIndex((checkbox) => checkbox.dataset.itemId === itemId);
      neighborId.current = (all[index + 1] ?? all[index - 1])?.dataset.itemId;
    },
  };
}

function ToBuyRows({ items, actions }: { items: ReadonlyArray<ListItem>; actions: ToBuyActions }) {
  return (
    <ul>
      {items.map((item) => (
        <ToBuyRow key={item.id} item={item} actions={actions} />
      ))}
    </ul>
  );
}
