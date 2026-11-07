import type { Liste } from "@ecureuil/domain";
import type { Mode } from "./useMode";

/** A moment the squirrel shows up for, as plain data: the view draws it. */
export type Celebration = {
  readonly title: string;
  readonly detail: string | undefined;
  /** It hops once when the moment arrives, or sits still. */
  readonly pose: "hop" | "rest";
  /** Only the end of the courses stays until closed: the others leave with their cause. */
  readonly dismissable: boolean;
};

export function celebrationFor({
  liste,
  mode,
  magasinName,
  putAway,
}: {
  liste: Liste;
  mode: Mode;
  magasinName: string;
  /** How many articles the sortie just finished put away, until its message is closed. */
  putAway: number | undefined;
}): Celebration | undefined {
  if (putAway !== undefined)
    return {
      title: "Courses terminées",
      detail: putAwayText(putAway),
      pose: "hop",
      dismissable: true,
    };
  // "Pas chez X" is not bought here: it does not hold the celebration back.
  if (liste.sections.length > 0) return undefined;
  if (liste.panier.length === 0)
    return {
      title: `Rien à acheter chez ${magasinName}`,
      detail: undefined,
      pose: "rest",
      dismissable: false,
    };
  return mode === "courses"
    ? {
        title: "Tout est dans le panier !",
        detail: "Plus qu'à terminer les courses.",
        pose: "hop",
        dismissable: false,
      }
    : undefined;
}

const plural = new Intl.PluralRules("fr");

export function putAwayText(count: number) {
  return plural.select(count) === "one" ? `${count} article rangé` : `${count} articles rangés`;
}
