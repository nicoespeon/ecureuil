import { Collapsible } from "@base-ui/react/collapsible";
import type { Liste, ListItem, Section } from "@ecureuil/domain";
import { type ReactNode, useId } from "react";

export function ListeView({ liste, magasinName }: { liste: Liste; magasinName: string }) {
  return (
    <div className="pb-24">
      {liste.sections.map((section) => (
        <ListeSection key={sectionKey(section)} title={sectionTitle(section)}>
          <ItemRows items={section.items} />
        </ListeSection>
      ))}
      {liste.pasVenduIci.length > 0 && (
        <PasVenduIci magasinName={magasinName} items={liste.pasVenduIci} />
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
}: {
  magasinName: string;
  items: ReadonlyArray<ListItem>;
}) {
  return (
    <Collapsible.Root render={<section />}>
      <h2 className={headingClassName}>
        <Collapsible.Trigger className="w-full text-left">
          Pas chez {magasinName} ({items.length})
        </Collapsible.Trigger>
      </h2>
      <Collapsible.Panel>
        <ItemRows items={items} />
      </Collapsible.Panel>
    </Collapsible.Root>
  );
}

function ItemRows({ items }: { items: ReadonlyArray<ListItem> }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="flex min-h-12 items-center gap-2 px-2">
          <input type="checkbox" aria-label={item.name} readOnly className="size-6" />
          <span className="truncate">{item.name}</span>
        </li>
      ))}
    </ul>
  );
}
