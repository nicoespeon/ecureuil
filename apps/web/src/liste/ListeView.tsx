import { Collapsible } from "@base-ui/react/collapsible";
import type { Liste, ListItem, Section } from "@ecureuil/domain";
import { type ReactNode, useId } from "react";
import { PanierRow, type ToBuyActions, ToBuyRow } from "./ItemRow";

type Actions = ToBuyActions & { readonly uncheck: (itemId: string) => void };

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
          <ToBuyRows items={section.items} actions={actions} />
        </ListeSection>
      ))}
      {liste.panier.length > 0 && (
        <ListeSection title="Dans le panier">
          <ul>
            {liste.panier.map((item) => (
              <PanierRow key={item.id} item={item} uncheck={actions.uncheck} />
            ))}
          </ul>
        </ListeSection>
      )}
      {liste.pasVenduIci.length > 0 && (
        <PasVenduIci magasinName={magasinName} items={liste.pasVenduIci} actions={actions} />
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
