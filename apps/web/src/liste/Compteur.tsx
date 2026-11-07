import { type Liste, unitCount } from "@ecureuil/domain";
import type { Mode } from "./useMode";

/**
 * Units, worded "articles" as on the receipt's item count: planned at home, panier over planned
 * in the magasin. The slash is for the eye; a screen reader hears the sentence.
 */
export function Compteur({ liste, mode }: { liste: Liste; mode: Mode }) {
  const { inPanier, planned } = unitCount(liste);
  if (planned === 0) return null;

  return (
    <p className="clay-well grid h-14 shrink-0 place-items-center rounded-full bg-white px-4 text-lg font-black whitespace-nowrap tabular-nums">
      {mode === "courses" ? (
        <>
          <span aria-hidden="true">
            {inPanier} / {planned}
          </span>
          <span className="sr-only">{inPanierOverPlanned(inPanier, planned)}</span>
        </>
      ) : (
        articles(planned)
      )}
    </p>
  );
}

const plural = new Intl.PluralRules("fr");

function inPanierOverPlanned(inPanier: number, planned: number) {
  const prevus = plural.select(planned) === "one" ? "prévu" : "prévus";
  return `${articles(inPanier)} dans le panier sur ${planned} ${prevus}`;
}

function articles(count: number) {
  return plural.select(count) === "one" ? `${count} article` : `${count} articles`;
}
