import { describe, expect, it } from "vitest";
import { listForMagasin } from "./list";
import { fold } from "./reducer";
import { seed, seedSorties } from "./seed";

const state = fold(seed);

describe("le seed de dev", () => {
  it("a Costco et Maxi avec leurs rayons dans l'ordre de parcours", () => {
    expect(state.magasins).toEqual({
      "magasin-costco": {
        id: "magasin-costco",
        name: "Costco",
        rayons: [
          { id: "rayon-costco-vetements", name: "Vêtements" },
          { id: "rayon-costco-hygiene", name: "Hygiène" },
          { id: "rayon-costco-epicerie", name: "Épicerie" },
          { id: "rayon-costco-collations", name: "Collations" },
          { id: "rayon-costco-boulangerie", name: "Boulangerie" },
          { id: "rayon-costco-fruits-legumes", name: "Fruits et légumes" },
          { id: "rayon-costco-produits-laitiers", name: "Produits laitiers" },
          { id: "rayon-costco-surgeles", name: "Surgelés" },
        ],
      },
      "magasin-maxi": {
        id: "magasin-maxi",
        name: "Maxi",
        rayons: [
          { id: "rayon-maxi-fruits-legumes", name: "Fruits et légumes" },
          { id: "rayon-maxi-boulangerie", name: "Boulangerie" },
          { id: "rayon-maxi-epicerie", name: "Épicerie" },
          { id: "rayon-maxi-sante-beaute", name: "Santé et beauté" },
          { id: "rayon-maxi-produits-laitiers", name: "Produits laitiers" },
          { id: "rayon-maxi-surgeles", name: "Surgelés" },
        ],
      },
    });
  });

  it("a une vingtaine d'items, dont ceux de la liste Cookidoo", () => {
    const names = Object.values(state.items).map((item) => item.name);

    expect(names).toHaveLength(20);
    expect(names).toEqual(
      expect.arrayContaining([
        "Babybel",
        "Champignons",
        "Lait",
        "Nutella",
        "Pretzel Crisps",
        "Pyjama polaire Gabriel",
        "Shampooing",
        "Yaourts",
      ]),
    );
  });

  it("achète trois Lait", () => {
    expect(state.items["item-lait"]).toMatchObject({ name: "Lait", quantity: 3 });
  });

  it("ne vend pas le pyjama chez Maxi", () => {
    expect(state.items["item-pyjama-polaire-gabriel"]?.rayonParMagasin).toMatchObject({
      "magasin-maxi": { _tag: "PasVenduIci" },
    });
  });

  it("parcourt Costco dans l'ordre des rayons, avec une section Non classé en dernier", () => {
    const sections = listForMagasin(state, "magasin-costco").sections.map((section) =>
      section._tag === "Rayon" ? section.rayonId : section._tag,
    );

    expect(sections).toEqual([
      "rayon-costco-vetements",
      "rayon-costco-hygiene",
      "rayon-costco-epicerie",
      "rayon-costco-collations",
      "rayon-costco-fruits-legumes",
      "rayon-costco-produits-laitiers",
      "NonClasse",
    ]);
  });

  it("met la moitié du catalogue sur la liste", () => {
    const toBuy = Object.values(state.items).filter((item) => item.status === "toBuy");

    expect(toBuy).toHaveLength(10);
  });

  it("a une demande de l'invite en attente de validation", () => {
    expect(Object.values(state.demandes)).toMatchObject([
      { id: "demande-chocolat-chaud", name: "Chocolat chaud", status: { _tag: "Pending" } },
    ]);
  });
});

describe("les sorties passées du seed de dev", () => {
  const withSorties = fold([...seed, ...seedSorties]);

  it("ajoutent trois sorties à Costco et deux à Maxi", () => {
    expect(withSorties.sorties.map((sortie) => sortie.magasin)).toEqual([
      "magasin-costco",
      "magasin-costco",
      "magasin-costco",
      "magasin-maxi",
      "magasin-maxi",
    ]);
  });

  it("laissent la liste du seed telle quelle", () => {
    expect(listForMagasin(withSorties, "magasin-costco")).toEqual(
      listForMagasin(state, "magasin-costco"),
    );
  });
});
