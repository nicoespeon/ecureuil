import type { Event, Filing } from "@ecureuil/wire";

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
  readonly filings: Readonly<Record<string, Exclude<Filing, { readonly _tag: "Unfiled" }>>>;
};

// "notToBuy" = in the catalogue only; "toBuy" = on the list; "inCart" = checked during a trip.
export type ItemStatus = "notToBuy" | "toBuy" | "inCart";

// One shopping run, closed by "Terminer les courses".
export type Trip = {
  readonly id: string;
  readonly store: string;
  readonly at: number;
  readonly purchases: ReadonlyArray<{ readonly itemId: string; readonly quantity: number }>;
};

// An item the guest asks for; the owner's first arbitration is final.
export type Request = {
  readonly id: string;
  readonly name: string;
  readonly requestedAt: number;
  readonly status: RequestStatus;
};

export type RequestStatus =
  | { readonly _tag: "Pending" }
  | { readonly _tag: "Accepted"; readonly itemId: string }
  | { readonly _tag: "Declined" };

export type State = {
  readonly stores: Readonly<Record<string, Store>>;
  readonly items: Readonly<Record<string, Item>>;
  readonly requests: Readonly<Record<string, Request>>;
  readonly trips: ReadonlyArray<Trip>;
};

export const initialState: State = { stores: {}, items: {}, requests: {}, trips: [] };

// Devices sync out of order and may resend: the journal is replayed in one total order
// (timestamp, then event id), each event once. Conflict rules fall out of that order.
export function fold(events: ReadonlyArray<Event>) {
  const unique = [...new Map(events.map((event) => [event.id, event])).values()];
  return unique.sort(byTimestampThenId).reduce(apply, initialState);
}

function byTimestampThenId(a: Event, b: Event) {
  return a.at - b.at || compare(a.id, b.id);
}

function compare(a: string, b: string) {
  if (a < b) return -1;
  return a > b ? 1 : 0;
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
        const filing = item.filings[event.store];
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
            filings: {},
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
      const { filing } = event.payload;
      const store = state.stores[event.store];
      if (!store) return state;
      if (filing._tag === "Aisle" && !store.aisles.some((aisle) => aisle.id === filing.aisleId)) {
        return state;
      }
      return updateItem(state, event.payload.itemId, (item) =>
        filing._tag === "Unfiled"
          ? unfile(item, event.store)
          : { ...item, filings: { ...item.filings, [event.store]: filing } },
      );
    }
    case "ItemMarkedToBuy":
      return updateItem(state, event.payload.itemId, list);
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
    case "RequestCreated":
      return state.requests[event.payload.requestId]
        ? state
        : withRequest(state, {
            id: event.payload.requestId,
            name: event.payload.name,
            requestedAt: event.at,
            status: { _tag: "Pending" },
          });
    case "RequestAccepted": {
      const { requestId, itemId } = event.payload;
      // Accepting toward an unknown item would settle the request for nothing: stay pending.
      if (!state.items[itemId]) return state;
      return arbitrate(state, requestId, { _tag: "Accepted", itemId }, (arbitrated) =>
        updateItem(arbitrated, itemId, list),
      );
    }
    case "RequestDeclined":
      return arbitrate(
        state,
        event.payload.requestId,
        { _tag: "Declined" },
        (arbitrated) => arbitrated,
      );
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
  const mentioned = [...new Set(aisleIds)].flatMap((id) =>
    aisles.filter((aisle) => aisle.id === id),
  );
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
  const items = Object.values(state.items).map((item) => [item.id, update(item)] as const);
  return { ...state, items: Object.fromEntries(items) };
}

// Puts an item on the list; already listed or in the cart, it stays where it is.
function list(item: Item): Item {
  return item.status === "notToBuy" ? { ...item, status: "toBuy" } : item;
}

function unfile(item: Item, storeId: string): Item {
  const { [storeId]: _unfiled, ...filings } = item.filings;
  return { ...item, filings };
}

function withRequest(state: State, request: Request): State {
  return { ...state, requests: { ...state.requests, [request.id]: request } };
}

// First arbitration wins: a request that is no longer pending ignores later verdicts.
function arbitrate(
  state: State,
  requestId: string,
  verdict: RequestStatus,
  then: (state: State) => State,
): State {
  const request = state.requests[requestId];
  return request?.status._tag === "Pending"
    ? then(withRequest(state, { ...request, status: verdict }))
    : state;
}
