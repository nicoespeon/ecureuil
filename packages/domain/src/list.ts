import type { Data } from "effect";
import type { Item, State } from "./reducer";

export type ListItem = { readonly id: string; readonly name: string; readonly quantity: number };

export type Section = Data.TaggedEnum<{
  Rayon: {
    readonly rayonId: string;
    readonly name: string;
    readonly items: ReadonlyArray<ListItem>;
  };
  NonClasse: { readonly items: ReadonlyArray<ListItem> };
}>;

/**
 * The list as walked in one magasin: its rayons in order (empty ones skipped), "Non classé"
 * last, "Pas chez X" and the panier apart. Another magasin re-sorts the same items.
 */
export type Liste = {
  readonly sections: ReadonlyArray<Section>;
  readonly pasVenduIci: ReadonlyArray<ListItem>;
  readonly panier: ReadonlyArray<ListItem>;
};

export function listForMagasin(state: State, magasinId: string): Liste {
  const listed = Object.values(state.items)
    .filter((item) => item.status !== "notToBuy")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const toBuy = listed.filter((item) => item.status === "toBuy");
  const rayonOf = (item: Item) => item.rayonParMagasin[magasinId];
  const rayons = state.magasins[magasinId]?.rayons ?? [];

  const sections: ReadonlyArray<Section> = [
    ...rayons.map((rayon) => ({
      _tag: "Rayon" as const,
      rayonId: rayon.id,
      name: rayon.name,
      items: toBuy
        .filter((item) => {
          const itemRayon = rayonOf(item);
          return itemRayon?._tag === "Rayon" && itemRayon.rayonId === rayon.id;
        })
        .map(toListItem),
    })),
    {
      _tag: "NonClasse" as const,
      items: toBuy.filter((item) => rayonOf(item) === undefined).map(toListItem),
    },
  ];

  return {
    sections: sections.filter((section) => section.items.length > 0),
    pasVenduIci: toBuy.filter((item) => rayonOf(item)?._tag === "PasVenduIci").map(toListItem),
    panier: listed.filter((item) => item.status === "inCart").map(toListItem),
  };
}

function toListItem({ id, name, quantity }: Item): ListItem {
  return { id, name, quantity };
}
