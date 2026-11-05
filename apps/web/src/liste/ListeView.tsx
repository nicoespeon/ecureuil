import { Collapsible } from "@base-ui/react/collapsible";
import type { Liste, ListItem, Section } from "@ecureuil/domain";
import { type ReactNode, useId } from "react";
import { animateMove, moveTransitionName } from "./animateMove";

type Actions = {
  readonly check: (itemId: string) => void;
  readonly uncheck: (itemId: string) => void;
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
  return (
    <div className="pb-24">
      {liste.sections.map((section) => (
        <ListeSection key={sectionKey(section)} title={sectionTitle(section)}>
          <ItemRows items={section.items} onToggle={actions.check} />
        </ListeSection>
      ))}
      {liste.panier.length > 0 && (
        <ListeSection title="Dans le panier">
          <ItemRows items={liste.panier} checked onToggle={actions.uncheck} />
        </ListeSection>
      )}
      {liste.pasVenduIci.length > 0 && (
        <PasVenduIci magasinName={magasinName} items={liste.pasVenduIci} onToggle={actions.check} />
      )}
    </div>
  );
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
  onToggle,
}: {
  magasinName: string;
  items: ReadonlyArray<ListItem>;
  onToggle: (itemId: string) => void;
}) {
  return (
    <Collapsible.Root render={<section />}>
      <h2 className={headingClassName}>
        <Collapsible.Trigger className="w-full text-left">
          Pas chez {magasinName} ({items.length})
        </Collapsible.Trigger>
      </h2>
      <Collapsible.Panel>
        <ItemRows items={items} onToggle={onToggle} />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function ItemRows({
  items,
  checked = false,
  onToggle,
}: {
  items: ReadonlyArray<ListItem>;
  checked?: boolean;
  onToggle: (itemId: string) => void;
}) {
  return (
    <ul>
      {items.map((item) => (
        <li
          key={item.id}
          className="flex min-h-12 items-center gap-2 px-2"
          style={{ viewTransitionName: moveTransitionName(item.id) }}
        >
          <input
            type="checkbox"
            aria-label={item.name}
            checked={checked}
            onChange={() => animateMove(() => onToggle(item.id))}
            className="size-6"
          />
          <span className="truncate">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}
