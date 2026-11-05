import {
  appendProprietaireEvent,
  type EventType,
  type PayloadOf,
} from "../journal/appendProprietaireEvent";
import type { Journal } from "../journal/journal";
import { itemRayonOf } from "./rayonChoice";

/**
 * What the configuration writes to the journal. Unlike the list, it targets a magasin by id:
 * the item sheet sets the rayon of every magasin, not only the active one. Item events carry
 * the active magasin as context.
 */
export function configActions(journal: Journal, magasinActifId: string) {
  const append = <T extends EventType>(type: T, magasin: string, payload: PayloadOf<T>) =>
    appendProprietaireEvent(journal, { type, magasin, payload });

  return {
    createRayon: (magasinId: string, name: string) =>
      append("RayonCreated", magasinId, { rayonId: crypto.randomUUID(), name }),
    renameRayon: (magasinId: string, rayon: { rayonId: string; name: string }) =>
      append("RayonRenamed", magasinId, rayon),
    reorderRayons: (magasinId: string, rayonIds: ReadonlyArray<string>) =>
      append("RayonsReordered", magasinId, { rayonIds }),
    removeRayon: (magasinId: string, rayonId: string) =>
      append("RayonRemoved", magasinId, { rayonId }),
    setItemRayon: (magasinId: string, { itemId, choice }: { itemId: string; choice: string }) =>
      append("ItemRayonSet", magasinId, { itemId, rayon: itemRayonOf(choice) }),
    renameItem: (itemId: string, name: string) =>
      append("ItemRenamed", magasinActifId, { itemId, name }),
    setQuantity: (itemId: string, quantity: number) =>
      append("ItemQuantitySet", magasinActifId, { itemId, quantity }),
    setToBuy: (itemId: string, toBuy: boolean) =>
      toBuy
        ? append("ItemMarkedToBuy", magasinActifId, { itemId })
        : append("ItemMarkedNotToBuy", magasinActifId, { itemId }),
    removeItem: (itemId: string) => append("ItemRemoved", magasinActifId, { itemId }),
  };
}

export type ConfigActions = ReturnType<typeof configActions>;
