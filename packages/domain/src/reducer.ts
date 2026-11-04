import type { Event, Placement } from "@ecureuil/wire";

export type Store = {
  readonly id: string;
  readonly name: string;
  readonly aisles: ReadonlyArray<Aisle>;
};

export type Aisle = { readonly id: string; readonly name: string };

export type Item = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly status: ItemStatus;
  // Per store. An absent store means unfiled ("Non classé").
  readonly placements: Readonly<Record<string, Filing>>;
};

// "notToBuy" = in the catalogue only; "toBuy" = on the list; "inCart" = checked during a trip.
export type ItemStatus = "notToBuy" | "toBuy" | "inCart";

export type Filing = Exclude<Placement, { readonly _tag: "Unfiled" }>;

// One shopping run, closed by "Terminer les courses".
export type Trip = {
  readonly id: string;
  readonly store: string;
  readonly at: number;
  readonly purchases: ReadonlyArray<{ readonly itemId: string; readonly quantity: number }>;
};

export type State = {
  readonly stores: Readonly<Record<string, Store>>;
  readonly items: Readonly<Record<string, Item>>;
  readonly trips: ReadonlyArray<Trip>;
};

export const initialState: State = { stores: {}, items: {}, trips: [] };

export function fold(events: ReadonlyArray<Event>) {
  return events.reduce(apply, initialState);
}

function apply(state: State, event: Event): State {
  switch (event.type) {
    case "StoreCreated":
      return state.stores[event.store]
        ? state
        : withStore(state, { id: event.store, name: event.payload.name, aisles: [] });
    case "StoreRenamed":
      return updateStore(state, event.store, (store) => ({ ...store, name: event.payload.name }));
    case "AisleCreated":
      return updateStore(state, event.store, (store) =>
        store.aisles.some((aisle) => aisle.id === event.payload.aisleId)
          ? store
          : {
              ...store,
              aisles: [...store.aisles, { id: event.payload.aisleId, name: event.payload.name }],
            },
      );
    case "AisleRenamed":
      return updateStore(state, event.store, (store) => ({
        ...store,
        aisles: store.aisles.map((aisle) =>
          aisle.id === event.payload.aisleId ? { ...aisle, name: event.payload.name } : aisle,
        ),
      }));
    case "AislesReordered":
      return updateStore(state, event.store, (store) => ({
        ...store,
        aisles: reorder(store.aisles, event.payload.aisleIds),
      }));
    case "AisleRemoved": {
      const { aisleId } = event.payload;
      const withoutAisle = updateStore(state, event.store, (store) => ({
        ...store,
        aisles: store.aisles.filter((aisle) => aisle.id !== aisleId),
      }));
      return updateItems(withoutAisle, (item) => {
        const filing = item.placements[event.store];
        return filing?._tag === "Aisle" && filing.aisleId === aisleId
          ? unfile(item, event.store)
          : item;
      });
    }
    case "ItemCreated":
      return state.items[event.payload.itemId]
        ? state
        : withItem(state, {
            id: event.payload.itemId,
            name: event.payload.name,
            quantity: 1,
            status: "notToBuy",
            placements: {},
          });
    case "ItemRenamed":
      return updateItem(state, event.payload.itemId, (item) => ({
        ...item,
        name: event.payload.name,
      }));
    case "ItemQuantitySet":
      return updateItem(state, event.payload.itemId, (item) => ({
        ...item,
        quantity: event.payload.quantity,
      }));
    case "ItemRemoved": {
      const { [event.payload.itemId]: _removed, ...items } = state.items;
      return { ...state, items };
    }
    case "ItemFiled": {
      const { placement } = event.payload;
      const aisles = state.stores[event.store]?.aisles ?? [];
      if (placement._tag === "Aisle" && !aisles.some((aisle) => aisle.id === placement.aisleId)) {
        return state;
      }
      return updateItem(state, event.payload.itemId, (item) =>
        placement._tag === "Unfiled"
          ? unfile(item, event.store)
          : { ...item, placements: { ...item.placements, [event.store]: placement } },
      );
    }
    case "ItemMarkedToBuy":
      return updateItem(state, event.payload.itemId, (item) =>
        item.status === "notToBuy" ? { ...item, status: "toBuy" } : item,
      );
    case "ItemMarkedNotToBuy":
      return updateItem(state, event.payload.itemId, (item) => ({ ...item, status: "notToBuy" }));
    case "ItemChecked":
      return updateItem(state, event.payload.itemId, (item) =>
        item.status === "notToBuy" ? item : { ...item, status: "inCart" },
      );
    case "ItemUnchecked":
      return updateItem(state, event.payload.itemId, (item) =>
        item.status === "inCart" ? { ...item, status: "toBuy" } : item,
      );
    case "TripFinished": {
      const bought = Object.values(state.items).filter((item) => item.status === "inCart");
      const trip: Trip = {
        id: event.id,
        store: event.store,
        at: event.at,
        purchases: bought.map(({ id, quantity }) => ({ itemId: id, quantity })),
      };
      const emptied = updateItems(state, (item) =>
        item.status === "inCart" ? { ...item, status: "notToBuy" } : item,
      );
      return { ...emptied, trips: [...state.trips, trip] };
    }
    default:
      return state;
  }
}

function withStore(state: State, store: Store): State {
  return { ...state, stores: { ...state.stores, [store.id]: store } };
}

function updateStore(state: State, storeId: string, update: (store: Store) => Store): State {
  const store = state.stores[storeId];
  return store ? withStore(state, update(store)) : state;
}

// Aisles created concurrently on another device keep their place after the given order.
function reorder(aisles: ReadonlyArray<Aisle>, aisleIds: ReadonlyArray<string>) {
  const mentioned = aisleIds.flatMap((id) => aisles.filter((aisle) => aisle.id === id));
  const unmentioned = aisles.filter((aisle) => !aisleIds.includes(aisle.id));
  return [...mentioned, ...unmentioned];
}

function withItem(state: State, item: Item): State {
  return { ...state, items: { ...state.items, [item.id]: item } };
}

function updateItem(state: State, itemId: string, update: (item: Item) => Item): State {
  const item = state.items[itemId];
  return item ? withItem(state, update(item)) : state;
}

function updateItems(state: State, update: (item: Item) => Item): State {
  return Object.values(state.items).reduce((acc, item) => withItem(acc, update(item)), state);
}

function unfile(item: Item, storeId: string): Item {
  const { [storeId]: _unfiled, ...placements } = item.placements;
  return { ...item, placements };
}
