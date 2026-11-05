import type { ItemRayon } from "@ecureuil/wire";
import {
  appendProprietaireEvent,
  type EventType,
  type PayloadOf,
} from "../journal/appendProprietaireEvent";
import type { Journal } from "../journal/journal";

/**
 * What the configuration writes to the journal. Unlike the list, it targets a magasin by id:
 * the item sheet sets the rayon of every magasin, not only the active one.
 */
export function configActions(journal: Journal) {
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
    setItemRayon: (magasinId: string, placement: { itemId: string; rayon: ItemRayon }) =>
      append("ItemRayonSet", magasinId, placement),
  };
}

export type ConfigActions = ReturnType<typeof configActions>;
