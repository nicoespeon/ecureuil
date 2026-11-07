import { fold, type Liste, listForMagasin } from "@ecureuil/domain";
import { expect, it } from "vitest";
import { foyerEvents } from "./liste-foyer";

const liste = `
. Lait x3
Mini croissants

. Babybel
Thé menthe
Saucisses x3
Thé menthe
`;

it("met les articles « . » sur la liste de Costco, dans leur rayon du seed quand le nom correspond", () => {
  const state = fold(foyerEvents(liste));

  expect(walk(listForMagasin(state, "magasin-costco"))).toEqual({
    sections: [["Produits laitiers", ["Babybel ×1", "Lait ×3"]]],
    pasVenduIci: ["Mini croissants", "Saucisses", "Thé menthe"],
  });
});

it("met les autres sur celle de Maxi, une seule fois, sans rayon quand le nom est inconnu", () => {
  const state = fold(foyerEvents(liste));

  expect(walk(listForMagasin(state, "magasin-maxi"))).toEqual({
    sections: [["Non classé", ["Mini croissants ×1", "Saucisses ×3", "Thé menthe ×1"]]],
    pasVenduIci: ["Babybel", "Lait"],
  });
});

/** The list as read in the magasin: section names, then "name ×quantity" per article. */
function walk({ sections, pasVenduIci }: Liste) {
  return {
    sections: sections.map((section) => [
      section._tag === "Rayon" ? section.name : "Non classé",
      section.articles.map(({ name, quantity }) => `${name} ×${quantity}`),
    ]),
    pasVenduIci: pasVenduIci.map(({ name }) => name),
  };
}
