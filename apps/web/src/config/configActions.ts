import { magasinCreation } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { appendEvent, type EventType, type PayloadOf } from "../journal/appendEvent";
import type { Journal } from "../journal/journal";
import { itemRayonOf } from "./rayonChoice";

/**
 * What the configuration writes to the journal. Unlike the list, it targets a magasin by id:
 * the item sheet sets the rayon of every magasin, not only the active one. Item events carry
 * the active magasin as context.
 */
export function configActions({ journal, actor }: Writer, magasinActifId: string) {
  const append = <T extends EventType>(type: T, magasin: string, payload: PayloadOf<T>) =>
    appendEvent(journal, { actor, type, magasin, payload });

  return {
    /** Returns the new magasin's id, so the screen can switch to it. */
    createMagasin: (name: string) => {
      const { magasinId, drafts } = magasinCreation({ name, newId: () => crypto.randomUUID() });
      for (const draft of drafts) appendEvent(journal, { actor, ...draft });
      return magasinId;
    },
    renameMagasin: (magasinId: string, name: string) =>
      append("MagasinRenamed", magasinId, { name }),
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

/** Where this device writes, and in which role: the API refuses any other actor. */
export type Writer = { readonly journal: Journal; readonly actor: Actor };
