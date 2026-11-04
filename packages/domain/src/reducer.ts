import type { Event } from "@ecureuil/wire";

export type Store = {
  readonly id: string;
  readonly name: string;
  readonly aisles: ReadonlyArray<Aisle>;
};

export type Aisle = { readonly id: string; readonly name: string };

export type State = {
  readonly stores: Readonly<Record<string, Store>>;
};

export const initialState: State = { stores: {} };

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
    case "AisleRemoved":
      return updateStore(state, event.store, (store) => ({
        ...store,
        aisles: store.aisles.filter((aisle) => aisle.id !== event.payload.aisleId),
      }));
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
