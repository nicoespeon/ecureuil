import { Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { duplicateOf, itemNamed, pendingDemandes } from "./demandes";
import { fold } from "./reducer";

const decode = Schema.decodeUnknownSync(Event);

let sequence = 0;

function event(type: string, payload: unknown) {
  sequence += 1;
  return decode({
    id: `e${sequence}`,
    at: sequence,
    actor: "invite",
    device: "iphone",
    magasin: null,
    type,
    payload,
  });
}

const demande = (demandeId: string, name: string) => event("DemandeCreated", { demandeId, name });
const item = (itemId: string, name: string) => event("ItemCreated", { itemId, name });

describe("les demandes en attente", () => {
  it("rend les demandes en attente, la plus ancienne d'abord", () => {
    const state = fold([
      demande("d1", "Chips"),
      demande("d2", "Café"),
      demande("d3", "Thé"),
      item("chips", "Chips"),
      event("DemandeAccepted", { demandeId: "d1", itemId: "chips" }),
    ]);

    expect(pendingDemandes(state).map(({ name }) => name)).toEqual(["Café", "Thé"]);
  });
});

describe("l'item d'une demande", () => {
  const state = fold([item("pates", "Pâtes"), item("lait", "Lait")]);

  it.each(["Pâtes", "pates", "  PÂTES "])("« %s » retrouve l'item Pâtes", (name) => {
    expect(itemNamed(state, name)).toMatchObject({ id: "pates", name: "Pâtes" });
  });

  it("ne retrouve rien pour un nom absent du catalogue", () => {
    expect(itemNamed(state, "Pâté")).toBeUndefined();
  });
});

describe("ce qu'une demande ferait en double", () => {
  const state = fold([
    item("lait", "Lait"),
    item("pain", "Pain"),
    item("cafe", "Café"),
    event("ItemMarkedToBuy", { itemId: "lait" }),
    event("ItemMarkedToBuy", { itemId: "pain" }),
    event("ItemChecked", { itemId: "pain" }),
    demande("d1", "Thé"),
    demande("d2", "Chips"),
    event("DemandeRefused", { demandeId: "d2" }),
  ]);

  it.each([
    ["lait", "Liste"],
    ["Pain", "Liste"],
    ["the", "Demande"],
    ["Café", undefined],
    ["Chips", undefined],
    ["Bière", undefined],
  ])("« %s » → %s", (name, duplicate) => {
    expect(duplicateOf(state, name)).toBe(duplicate);
  });
});
