import type { State } from "./reducer";

/** The demandes still waiting for the proprietaire, oldest first: the order they came in. */
export function pendingDemandes(state: State) {
  return byRequestedAt(state).filter((demande) => demande.status._tag === "Pending");
}

/** The catalogue article a demande names, if any: "pates" finds "Pâtes ". */
export function articleNamed(state: State, name: string) {
  return Object.values(state.articles).find((article) => sameName(article.name, name));
}

/**
 * What the invite would duplicate by asking for this name: an article already on the Liste (to buy
 * or in the panier), or a Demande still pending.
 */
export function duplicateOf(state: State, name: string) {
  const listed = Object.values(state.articles).some(
    (article) => article.status !== "notToBuy" && sameName(article.name, name),
  );
  if (listed) return "Liste";
  return pendingDemandes(state).some((demande) => sameName(demande.name, name))
    ? "Demande"
    : undefined;
}

function byRequestedAt(state: State) {
  return Object.values(state.demandes).sort(
    (a, b) => a.requestedAt - b.requestedAt || a.id.localeCompare(b.id),
  );
}

function sameName(a: string, b: string) {
  return a.trim().localeCompare(b.trim(), "fr", { sensitivity: "base" }) === 0;
}
