import { Collapsible } from "@base-ui/react/collapsible";
import type { Liste, ListItem, Section } from "@ecureuil/domain";
import { type ReactNode, useId, useLayoutEffect, useRef } from "react";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ItemRow";

type Actions = {
  readonly check: (itemId: string) => void;
  readonly uncheck: (itemId: string) => void;
  readonly setQuantity: (itemId: string, quantity: number) => void;
  readonly removeFromList: (itemId: string) => void;
  readonly announce: (message: string) => void;
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
      {liste.sections.map((section) => (
        <ListeSection key={sectionKey(section)} title={sectionTitle(section)}>
          <ToBuyRows items={section.items} actions={rowActions} />
        </ListeSection>
      ))}
      {liste.panier.length > 0 && (
        <ListeSection title="Dans le panier">
          <ul>
            {liste.panier.map((item) => (
              <PanierRow key={item.id} item={item} uncheck={rowActions.uncheck} />
            ))}
          </ul>
        </ListeSection>
      )}
      {liste.pasVenduIci.length > 0 && (
        <PasVenduIci magasinName={magasinName} items={liste.pasVenduIci} actions={rowActions} />
      )}
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

function sectionKey(section: Section) {
  return section._tag === "Rayon" ? section.rayonId : "non-classe";
}

function sectionTitle(section: Section) {
  return section._tag === "Rayon" ? section.name : "Non classé";
}

const headingClassName =
  "sticky top-14 z-10 border-b border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800";

function ListeSection({ title, children }: { title: string; children: ReactNode }) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className={headingClassName}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function PasVenduIci({
  magasinName,
  items,
  actions,
}: {
  magasinName: string;
  items: ReadonlyArray<ListItem>;
  actions: ToBuyActions;
}) {
  return (
    <Collapsible.Root render={<section />}>
      <h2 className={headingClassName}>
        <Collapsible.Trigger className="w-full text-left">
          Pas chez {magasinName} ({items.length})
        </Collapsible.Trigger>
      </h2>
      <Collapsible.Panel>
        <ToBuyRows items={items} actions={actions} />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
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
