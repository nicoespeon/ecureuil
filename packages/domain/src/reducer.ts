import type { Event, ItemRayon } from "@ecureuil/wire";
import { Data, Match } from "effect";

export type Magasin = {
  readonly id: string;
  readonly name: string;
  readonly rayons: ReadonlyArray<Rayon>;
};

export type Rayon = { readonly id: string; readonly name: string };

export type Item = {
  readonly id: string;
  readonly name: string;
  readonly quantity: number;
  readonly status: ItemStatus;
  /**
   * Per magasin. An absent magasin means NonClasse ("Non classé").
   */
  readonly rayonParMagasin: Readonly<
    Record<string, Exclude<ItemRayon, { readonly _tag: "NonClasse" }>>
  >;
};

/**
 * "notToBuy" = in the catalogue only; "toBuy" = on the list; "inCart" = checked during a sortie.
 */
export type ItemStatus = "notToBuy" | "toBuy" | "inCart";

/**
 * One shopping run, closed by "Terminer les courses".
 */
export type Sortie = {
  readonly id: string;
  readonly magasin: string;
  readonly at: number;
  readonly achats: ReadonlyArray<{ readonly itemId: string; readonly quantity: number }>;
};

/**
 * An item the guest asks for; the owner's first arbitration is final.
 */
export type Demande = {
  readonly id: string;
  readonly name: string;
  readonly requestedAt: number;
  readonly status: DemandeStatus;
};

export type DemandeStatus = Data.TaggedEnum<{
  Pending: Record<never, never>;
  Accepted: { readonly itemId: string };
  Refused: Record<never, never>;
}>;
const DemandeStatus = Data.taggedEnum<DemandeStatus>();

export type State = {
  readonly magasins: Readonly<Record<string, Magasin>>;
  readonly items: Readonly<Record<string, Item>>;
  readonly demandes: Readonly<Record<string, Demande>>;
  readonly sorties: ReadonlyArray<Sortie>;
};

export const initialState: State = { magasins: {}, items: {}, demandes: {}, sorties: [] };

/**
 * Devices sync out of order and may resend: the journal is replayed in one total order
 * (timestamp, then event id), each event once. Conflict rules fall out of that order.
 */
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
  return applyEvent(event)(state);
}

const applyEvent = Match.type<Event>().pipe(
  Match.discriminatorsExhaustive("type")({
    MagasinCreated: (event) => (state: State) =>
      state.magasins[event.magasin]
        ? state
        : withMagasin(state, { id: event.magasin, name: event.payload.name, rayons: [] }),
    MagasinRenamed: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({ ...magasin, name: event.payload.name })),
    RayonCreated: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) =>
        magasin.rayons.some((rayon) => rayon.id === event.payload.rayonId)
          ? magasin
          : {
              ...magasin,
              rayons: [...magasin.rayons, { id: event.payload.rayonId, name: event.payload.name }],
            },
      ),
    RayonRenamed: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: magasin.rayons.map((rayon) =>
          rayon.id === event.payload.rayonId ? { ...rayon, name: event.payload.name } : rayon,
        ),
      })),
    RayonsReordered: (event) => (state: State) =>
      updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: reorder(magasin.rayons, event.payload.rayonIds),
      })),
    RayonRemoved: (event) => (state: State) => {
      const { rayonId } = event.payload;
      const withoutRayon = updateMagasin(state, event.magasin, (magasin) => ({
        ...magasin,
        rayons: magasin.rayons.filter((rayon) => rayon.id !== rayonId),
      }));
      return updateItems(withoutRayon, (item) => {
        const itemRayon = item.rayonParMagasin[event.magasin];
        return itemRayon?._tag === "Rayon" && itemRayon.rayonId === rayonId
          ? unsetRayon(item, event.magasin)
          : item;
      });
    },
    ItemCreated: (event) => (state: State) =>
      state.items[event.payload.itemId]
        ? state
        : withItem(state, {
            id: event.payload.itemId,
            name: event.payload.name,
            quantity: 1,
            status: "notToBuy",
            rayonParMagasin: {},
          }),
    ItemRenamed: (event) => (state: State) =>
      updateItem(state, event.payload.itemId, (item) => ({ ...item, name: event.payload.name })),
    ItemQuantitySet: (event) => (state: State) =>
      updateItem(state, event.payload.itemId, (item) => ({
        ...item,
        quantity: event.payload.quantity,
      })),
    ItemRemoved: (event) => (state: State) => {
      const { [event.payload.itemId]: _removed, ...items } = state.items;
      return { ...state, items };
    },
    ItemRayonSet: (event) => (state: State) => {
      const { rayon: itemRayon } = event.payload;
      const magasin = state.magasins[event.magasin];
      if (!magasin) return state;
      if (
        itemRayon._tag === "Rayon" &&
        !magasin.rayons.some((rayon) => rayon.id === itemRayon.rayonId)
      ) {
        return state;
      }
      return updateItem(state, event.payload.itemId, (item) =>
        itemRayon._tag === "NonClasse"
          ? unsetRayon(item, event.magasin)
          : { ...item, rayonParMagasin: { ...item.rayonParMagasin, [event.magasin]: itemRayon } },
      );
    },
    ItemMarkedToBuy: (event) => (state: State) => updateItem(state, event.payload.itemId, list),
    ItemMarkedNotToBuy: (event) => (state: State) =>
      updateItem(state, event.payload.itemId, (item) => ({ ...item, status: "notToBuy" })),
    ItemChecked: (event) => (state: State) =>
      updateItem(state, event.payload.itemId, (item) =>
        item.status === "notToBuy" ? item : { ...item, status: "inCart" },
      ),
    ItemUnchecked: (event) => (state: State) =>
      updateItem(state, event.payload.itemId, (item) =>
        item.status === "inCart" ? { ...item, status: "toBuy" } : item,
      ),
    SortieFinished: (event) => (state: State) => {
      const bought = Object.values(state.items).filter((item) => item.status === "inCart");
      const sortie: Sortie = {
        id: event.id,
        magasin: event.magasin,
        at: event.at,
        achats: bought.map(({ id, quantity }) => ({ itemId: id, quantity })),
      };
      const emptied = updateItems(state, (item) =>
        item.status === "inCart" ? { ...item, status: "notToBuy" } : item,
      );
      return { ...emptied, sorties: [...state.sorties, sortie] };
    },
    DemandeCreated: (event) => (state: State) =>
      state.demandes[event.payload.demandeId]
        ? state
        : withDemande(state, {
            id: event.payload.demandeId,
            name: event.payload.name,
            requestedAt: event.at,
            status: DemandeStatus.Pending(),
          }),
    DemandeAccepted: (event) => (state: State) => {
      const { demandeId, itemId } = event.payload;
      const demande = pendingDemande(state, demandeId);
      // Accepting toward an unknown item would settle the demande for nothing: stay pending.
      if (!demande || !state.items[itemId]) return state;
      const accepted = { ...demande, status: DemandeStatus.Accepted({ itemId }) };
      return updateItem(withDemande(state, accepted), itemId, list);
    },
    DemandeRefused: (event) => (state: State) => {
      const demande = pendingDemande(state, event.payload.demandeId);
      return demande ? withDemande(state, { ...demande, status: DemandeStatus.Refused() }) : state;
    },
  }),
);

function withMagasin(state: State, magasin: Magasin): State {
  return { ...state, magasins: { ...state.magasins, [magasin.id]: magasin } };
}

function updateMagasin(
  state: State,
  magasinId: string,
  update: (magasin: Magasin) => Magasin,
): State {
  const magasin = state.magasins[magasinId];
  return magasin ? withMagasin(state, update(magasin)) : state;
}

/**
 * Rayons created concurrently on another device keep their place after the given order.
 */
function reorder(rayons: ReadonlyArray<Rayon>, rayonIds: ReadonlyArray<string>) {
  const mentioned = [...new Set(rayonIds)].flatMap((id) =>
    rayons.filter((rayon) => rayon.id === id),
  );
  const unmentioned = rayons.filter((rayon) => !rayonIds.includes(rayon.id));
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

/**
 * Puts an item on the list; already listed or in the panier, it stays where it is.
 */
function list(item: Item): Item {
  return item.status === "notToBuy" ? { ...item, status: "toBuy" } : item;
}

function unsetRayon(item: Item, magasinId: string): Item {
  const { [magasinId]: _unfiled, ...rayonParMagasin } = item.rayonParMagasin;
  return { ...item, rayonParMagasin };
}

function withDemande(state: State, demande: Demande): State {
  return { ...state, demandes: { ...state.demandes, [demande.id]: demande } };
}

/**
 * The demande while it is still pending. First arbitration wins, so a later verdict finds
 * nothing to settle.
 */
function pendingDemande(state: State, demandeId: string) {
  const demande = state.demandes[demandeId];
  return demande?.status._tag === "Pending" ? demande : undefined;
}
