import { magasinCreation } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { appendEvent, type EventType, type PayloadOf } from "../journal/appendEvent";
import type { Journal } from "../journal/journal";
import { articleRayonOf } from "./rayonChoice";

/**
 * What the configuration writes to the journal. Unlike the list, it targets a magasin by id:
 * the article sheet sets the rayon of every magasin, not only the active one. Article events carry
 * the active magasin as context.
 */
export function configActions({ journal, actor }: Writer, magasinActifId: string) {
  const append = <T extends EventType>(type: T, magasin: string, payload: PayloadOf<T>) =>
    appendEvent(journal, { actor, type, magasin, payload });

  return {
    renameMagasin: (magasinId: string, name: string) =>
      append("MagasinRenamed", magasinId, { name }),
    removeMagasin: (magasinId: string) => append("MagasinRemoved", magasinId, {}),
    createRayon: (magasinId: string, name: string) =>
      append("RayonCreated", magasinId, { rayonId: crypto.randomUUID(), name }),
    renameRayon: (magasinId: string, rayon: { rayonId: string; name: string }) =>
      append("RayonRenamed", magasinId, rayon),
    reorderRayons: (magasinId: string, rayonIds: ReadonlyArray<string>) =>
      append("RayonsReordered", magasinId, { rayonIds }),
    removeRayon: (magasinId: string, rayonId: string) =>
      append("RayonRemoved", magasinId, { rayonId }),
    setArticleRayon: (
      magasinId: string,
      { articleId, choice }: { articleId: string; choice: string },
    ) => append("ArticleRayonSet", magasinId, { articleId, rayon: articleRayonOf(choice) }),
    /** Into the catalogue only, NonClasse everywhere: the list is not this screen's business. Returns its id. */
    createArticle: (name: string) => {
      const articleId = crypto.randomUUID();
      append("ArticleCreated", magasinActifId, { articleId, name });
      return articleId;
    },
    renameArticle: (articleId: string, name: string) =>
      append("ArticleRenamed", magasinActifId, { articleId, name }),
    setQuantity: (articleId: string, quantity: number) =>
      append("ArticleQuantitySet", magasinActifId, { articleId, quantity }),
    setToBuy: (articleId: string, toBuy: boolean) =>
      toBuy
        ? append("ArticleMarkedToBuy", magasinActifId, { articleId })
        : append("ArticleMarkedNotToBuy", magasinActifId, { articleId }),
    removeArticle: (articleId: string) => append("ArticleRemoved", magasinActifId, { articleId }),
  };
}

/** Returns the new magasin's id, so the screen can switch to it. */
export function createMagasin({ journal, actor }: Writer, name: string) {
  const { magasinId, drafts } = magasinCreation({ name, newId: () => crypto.randomUUID() });
  for (const draft of drafts) appendEvent(journal, { actor, ...draft });
  return magasinId;
}

export type ConfigActions = ReturnType<typeof configActions>;

/** Where this device writes, and in which role: the API refuses any other actor. */
export type Writer = { readonly journal: Journal; readonly actor: Actor };
