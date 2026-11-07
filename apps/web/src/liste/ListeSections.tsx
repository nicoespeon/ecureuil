import { Collapsible } from "@base-ui/react/collapsible";
import type { ListArticle, Liste, Section } from "@ecureuil/domain";
import { type ReactNode, useId } from "react";

type Rows = (articles: ReadonlyArray<ListArticle>) => ReactNode;

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
        <ListeSection key={sectionKey(section)} title={sectionTitle(section)}>
          {toBuyRows(section.articles)}
        </ListeSection>
      ))}
      {liste.panier.length > 0 && (
        <ListeSection title="Dans le panier" tone="panier">
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
  title,
  tone = "rayon",
  children,
}: {
  title: string;
  /** The panier is not a rayon of the magasin: the whole block is tinted, rows included. */
  tone?: "rayon" | "panier";
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      aria-labelledby={headingId}
      className={tone === "panier" ? panierClassName : undefined}
    >
      <h2 id={headingId} className={tone === "panier" ? panierHeadingClassName : headingClassName}>
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
  "sticky-heading px-5 pt-3 pb-2 text-sm font-black tracking-wide text-neutral-700 uppercase";

const panierClassName = "[&_li]:border-emerald-100 [&_ul]:bg-emerald-50";

const panierHeadingClassName =
  "sticky-heading px-5 pt-3 pb-2 text-sm font-black tracking-wide text-emerald-800 uppercase";

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
      <h2 id={headingId} className={`${headingClassName} pt-2 pb-0`}>
        <Collapsible.Trigger className="group flex min-h-11 w-full items-center gap-2 text-left uppercase focus-visible:outline-2 focus-visible:outline-blue-700">
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
