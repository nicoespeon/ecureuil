import { Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { articleNamed, duplicateOf, pendingDemandes } from "./demandes";
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
const article = (articleId: string, name: string) => event("ArticleCreated", { articleId, name });

describe("les demandes en attente", () => {
  it("rend les demandes en attente, la plus ancienne d'abord", () => {
    const state = fold([
      demande("d1", "Chips"),
      demande("d2", "Café"),
      demande("d3", "Thé"),
      article("chips", "Chips"),
      event("DemandeAccepted", { demandeId: "d1", articleId: "chips" }),
    ]);

    expect(pendingDemandes(state).map(({ name }) => name)).toEqual(["Café", "Thé"]);
  });
});

describe("l'article d'une demande", () => {
  const state = fold([article("pates", "Pâtes"), article("lait", "Lait")]);

  it.each(["Pâtes", "pates", "  PÂTES "])("« %s » retrouve l'article Pâtes", (name) => {
    expect(articleNamed(state, name)).toMatchObject({ id: "pates", name: "Pâtes" });
  });

  it("ne retrouve rien pour un nom absent du catalogue", () => {
    expect(articleNamed(state, "Pâté")).toBeUndefined();
  });
});

describe("ce qu'une demande ferait en double", () => {
  const state = fold([
    article("lait", "Lait"),
    article("pain", "Pain"),
    article("cafe", "Café"),
    event("ArticleMarkedToBuy", { articleId: "lait" }),
    event("ArticleMarkedToBuy", { articleId: "pain" }),
    event("ArticleChecked", { articleId: "pain" }),
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
