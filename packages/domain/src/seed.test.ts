import { describe, expect, it } from "vitest";
import { listForMagasin } from "./list";
import { fold } from "./reducer";
import { seed } from "./seed";

const state = fold(seed);

describe("the dev seed", () => {
  it("has Costco and Maxi with their rayons in walking order", () => {
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

  it("has about twenty items, including the ones on the Cookidoo list", () => {
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

  it("buys three Lait", () => {
    expect(state.items["item-lait"]).toMatchObject({ name: "Lait", quantity: 3 });
  });

  it("does not sell the pyjama at Maxi", () => {
    expect(state.items["item-pyjama-polaire-gabriel"]?.rayonParMagasin).toMatchObject({
      "magasin-maxi": { _tag: "PasVenduIci" },
    });
  });

  it("walks Costco in rayon order, with a Non classé section last", () => {
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

  it("keeps part of the catalogue off the list", () => {
    const statuses = Object.values(state.items).map((item) => item.status);

    expect(statuses).toEqual(expect.arrayContaining(["toBuy", "notToBuy"]));
  });

  it("has one demande from the invite waiting for validation", () => {
    expect(Object.values(state.demandes)).toMatchObject([
      { id: "demande-chocolat-chaud", name: "Chocolat chaud", status: { _tag: "Pending" } },
    ]);
  });

  it("never reuses an event id, which fold would silently drop", () => {
    const ids = new Set(seed.map((event) => event.id));

    expect(ids.size).toBe(seed.length);
  });
});
