import { Collapsible } from "@base-ui/react/collapsible";
import type { Liste, ListItem, Section } from "@ecureuil/domain";
import { type ReactNode, useId } from "react";
import { headingTransitionName } from "./animateMove";

type Rows = (items: ReadonlyArray<ListItem>) => ReactNode;

/**
 * The list as walked in the magasin, whoever reads it: the rows are the caller's, with or
 * without the gestures of the courses.
 */
export function ListeSections({
  liste,
  magasinName,
  toBuyRows,
  panierRows,
}: {
  liste: Liste;
  magasinName: string;
  toBuyRows: Rows;
  panierRows: Rows;
}) {
  return (
    <>
      {liste.sections.map((section) => (
        <ListeSection
          key={sectionKey(section)}
          id={sectionKey(section)}
          title={sectionTitle(section)}
        >
          {toBuyRows(section.items)}
        </ListeSection>
      ))}
      {liste.panier.length > 0 && (
        <ListeSection id="panier" title="Dans le panier" tone="panier">
          {panierRows(liste.panier)}
        </ListeSection>
      )}
      {liste.pasVenduIci.length > 0 && (
        <PasVenduIci magasinName={magasinName} count={liste.pasVenduIci.length}>
          {toBuyRows(liste.pasVenduIci)}
        </PasVenduIci>
      )}
    </>
  );
}

export function ListeSection({
  id,
  title,
  tone = "rayon",
  children,
}: {
  id: string;
  title: string;
  /** The panier is not a rayon of the magasin: its heading says so, quietly. */
  tone?: "rayon" | "panier";
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        style={{ viewTransitionName: headingTransitionName(id) }}
        className={tone === "panier" ? panierHeadingClassName : headingClassName}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function sectionKey(section: Section) {
  return section._tag === "Rayon" ? `rayon-${section.rayonId}` : "non-classe";
}

function sectionTitle(section: Section) {
  return section._tag === "Rayon" ? section.name : "Non classé";
}

const headingClassName =
  "sticky top-14 z-10 border-b border-neutral-200 bg-neutral-100 px-4 py-2 text-sm font-semibold text-neutral-800";

const panierHeadingClassName =
  "sticky top-14 z-10 border-b border-emerald-200 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-900";

function PasVenduIci({
  magasinName,
  count,
  children,
}: {
  magasinName: string;
  count: number;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <Collapsible.Root render={<section aria-labelledby={headingId} />}>
      <h2
        id={headingId}
        style={{ viewTransitionName: headingTransitionName("pas-vendu-ici") }}
        className={headingClassName}
      >
        <Collapsible.Trigger className="group flex w-full items-center gap-2 text-left">
          <svg
            aria-hidden="true"
            width="12"
            height="12"
            viewBox="0 0 16 16"
            fill="currentColor"
            className="motion-safe:transition-transform group-data-panel-open:rotate-90"
          >
            <path d="M6 12V4l4.5 4z" />
          </svg>
          Pas chez {magasinName} ({count})
        </Collapsible.Trigger>
      </h2>
      <Collapsible.Panel>{children}</Collapsible.Panel>
    </Collapsible.Root>
  );
}
