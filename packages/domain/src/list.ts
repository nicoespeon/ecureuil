import type { Item, State } from "./reducer";

export type ListItem = { readonly id: string; readonly name: string; readonly quantity: number };

export type Section =
  | {
      readonly _tag: "Aisle";
      readonly aisleId: string;
      readonly name: string;
      readonly items: ReadonlyArray<ListItem>;
    }
  | { readonly _tag: "Unfiled"; readonly items: ReadonlyArray<ListItem> };

// The list as walked in one store: its aisles in order (empty ones skipped), "Non classé"
// last, "Pas chez X" and the cart apart. Another store re-sorts the same items.
export type StoreList = {
  readonly sections: ReadonlyArray<Section>;
  readonly notSoldHere: ReadonlyArray<ListItem>;
  readonly cart: ReadonlyArray<ListItem>;
};

export function listForStore(state: State, storeId: string): StoreList {
  const listed = Object.values(state.items)
    .filter((item) => item.status !== "notToBuy")
    .sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const toBuy = listed.filter((item) => item.status === "toBuy");
  const filingOf = (item: Item) => item.filings[storeId];
  const aisles = state.stores[storeId]?.aisles ?? [];

  const sections: ReadonlyArray<Section> = [
    ...aisles.map((aisle) => ({
      _tag: "Aisle" as const,
      aisleId: aisle.id,
      name: aisle.name,
      items: toBuy
        .filter((item) => {
          const filing = filingOf(item);
          return filing?._tag === "Aisle" && filing.aisleId === aisle.id;
        })
        .map(toListItem),
    })),
    {
      _tag: "Unfiled" as const,
      items: toBuy.filter((item) => filingOf(item) === undefined).map(toListItem),
    },
  ];

  return {
    sections: sections.filter((section) => section.items.length > 0),
    notSoldHere: toBuy.filter((item) => filingOf(item)?._tag === "NotSoldHere").map(toListItem),
    cart: listed.filter((item) => item.status === "inCart").map(toListItem),
  };
}

function toListItem({ id, name, quantity }: Item): ListItem {
  return { id, name, quantity };
}
