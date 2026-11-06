import {
  articleNamed,
  type Demande,
  fold,
  type Liste,
  listForMagasin,
  type Magasin,
} from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { useMemo, useState, useSyncExternalStore } from "react";
import { appendEvent, type EventType, type PayloadOf } from "./appendEvent";
import type { Journal } from "./journal";

export type Foyer = ReturnType<typeof useFoyer>;

/** The foyer once a magasin is active, as the list screens see it. */
export type FoyerWithListe = Foyer & { magasinActif: Magasin; liste: Liste };

const MAGASIN_ACTIF_KEY = "ecureuil.magasinActif";

/**
 * The foyer as React sees it: the state replayed from the whole journal, the list of the
 * active magasin, and plain functions that append events.
 */
export function useFoyer(journal: Journal, actor: Actor) {
  const events = useSyncExternalStore(journal.subscribe, journal.all);
  const state = useMemo(() => fold(events), [events]);
  const magasins = Object.values(state.magasins);

  const [preferredMagasinId, setPreferredMagasinId] = useState(readPreferredMagasinId);
  const magasinActif =
    (preferredMagasinId === null ? undefined : state.magasins[preferredMagasinId]) ?? magasins[0];
  const magasinActifId = magasinActif?.id;
  const liste = useMemo(
    () => (magasinActifId === undefined ? undefined : listForMagasin(state, magasinActifId)),
    [state, magasinActifId],
  );

  const append = <T extends EventType>(type: T, payload: PayloadOf<T>) => {
    if (magasinActifId !== undefined)
      appendEvent(journal, { actor, type, magasin: magasinActifId, payload });
  };

  return {
    state,
    magasins,
    magasinActif,
    liste,
    selectMagasin: (magasinId: string) => {
      writePreferredMagasinId(magasinId);
      setPreferredMagasinId(magasinId);
    },
    check: (articleId: string) => append("ArticleChecked", { articleId }),
    uncheck: (articleId: string) => append("ArticleUnchecked", { articleId }),
    setQuantity: (articleId: string, quantity: number) =>
      append("ArticleQuantitySet", { articleId, quantity }),
    removeFromList: (articleId: string) => append("ArticleMarkedNotToBuy", { articleId }),
    markToBuy: (articleId: string) => append("ArticleMarkedToBuy", { articleId }),
    /** A new article is NonClasse in every magasin until it is sorted. Returns its id. */
    createArticle: (name: string) => {
      const articleId = crypto.randomUUID();
      append("ArticleCreated", { articleId, name });
      append("ArticleMarkedToBuy", { articleId });
      return articleId;
    },
    finishSortie: () => append("SortieFinished", {}),
    askFor: (name: string) => append("DemandeCreated", { demandeId: crypto.randomUUID(), name }),
    /**
     * Lists the catalogue article of the same name, or a new one, "Non classé" everywhere. The new
     * article takes the demande's id: two devices accepting before a sync create the same article once.
     */
    acceptDemande: (demande: Demande) => {
      const existing = articleNamed(state, demande.name);
      const articleId = existing?.id ?? demande.id;
      if (!existing) append("ArticleCreated", { articleId, name: demande.name });
      append("DemandeAccepted", { demandeId: demande.id, articleId });
    },
    refuseDemande: (demande: Demande) => append("DemandeRefused", { demandeId: demande.id }),
    withdrawDemande: (demande: Demande) => append("DemandeWithdrawn", { demandeId: demande.id }),
  };
}

/**
 * A device preference, not a fact of the foyer: it stays out of the journal. Storage can be
 * blocked by the browser; the app then falls back to the first magasin.
 */
function readPreferredMagasinId() {
  try {
    return localStorage.getItem(MAGASIN_ACTIF_KEY);
  } catch {
    return null;
  }
}

function writePreferredMagasinId(magasinId: string) {
  try {
    localStorage.setItem(MAGASIN_ACTIF_KEY, magasinId);
  } catch {
    // Not remembered on this device; the choice still holds until the page reloads.
  }
}
