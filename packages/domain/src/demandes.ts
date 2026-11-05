import type { State } from "./reducer";

/** The demandes still waiting for the proprietaire, oldest first: the order they came in. */
export function pendingDemandes(state: State) {
  return byRequestedAt(state).filter((demande) => demande.status._tag === "Pending");
}

/** What the invite asked for lately, newest first, whatever became of it. */
export function latestDemandes(state: State, count: number) {
  return byRequestedAt(state).reverse().slice(0, count);
}

/** The catalogue item a demande names, if any: "pates" finds "Pâtes ". */
export function itemNamed(state: State, name: string) {
  return Object.values(state.items).find((item) => sameName(item.name, name));
}

function byRequestedAt(state: State) {
  return Object.values(state.demandes).sort(
    (a, b) => a.requestedAt - b.requestedAt || a.id.localeCompare(b.id),
  );
}

function sameName(a: string, b: string) {
  return a.trim().localeCompare(b.trim(), "fr", { sensitivity: "base" }) === 0;
}
