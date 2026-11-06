import type { Liste, ListItem } from "@ecureuil/domain";
import { useLayoutEffect, useRef } from "react";
import type { useFoyer } from "../journal/useFoyer";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ItemRow";
import { ListeSections } from "./ListeSections";
import type { Mode } from "./useMode";

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
        toBuyRows={(items) => <ToBuyRows items={items} actions={rowActions} mode={mode} />}
        panierRows={(items) => (
          <ul>
            {items.map((item) => (
              <PanierRow key={item.id} item={item} actions={rowActions} mode={mode} />
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
    ...(containerRef.current?.querySelectorAll<HTMLElement>("[data-item-id]") ?? []),
  ];

  useLayoutEffect(() => {
    if (neighborId.current === undefined) return;
    const neighbor = rowControls().find((control) => control.dataset.itemId === neighborId.current);
    neighborId.current = undefined;
    neighbor?.focus({ preventScroll: true });
  });

  return {
    containerRef,
    focusNeighborOf: (itemId: string) => {
      const all = rowControls();
      const index = all.findIndex((control) => control.dataset.itemId === itemId);
      neighborId.current = (all[index + 1] ?? all[index - 1])?.dataset.itemId;
    },
  };
}

function ToBuyRows({
  items,
  actions,
  mode,
}: {
  items: ReadonlyArray<ListItem>;
  actions: ToBuyActions;
  mode: Mode;
}) {
  return (
    <ul>
      {items.map((item) => (
        <ToBuyRow key={item.id} item={item} actions={actions} mode={mode} />
      ))}
    </ul>
  );
}
