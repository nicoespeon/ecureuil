import { fold, listForMagasin } from "@ecureuil/domain";
import { useMemo, useState, useSyncExternalStore } from "react";
import { appendProprietaireEvent, type EventType, type PayloadOf } from "./appendProprietaireEvent";
import type { Journal } from "./journal";

const MAGASIN_ACTIF_KEY = "ecureuil.magasinActif";

/**
 * The foyer as React sees it: the state replayed from the whole journal, the list of the
 * active magasin, and plain functions that append events.
 */
export function useFoyer(journal: Journal) {
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
      appendProprietaireEvent(journal, { type, magasin: magasinActifId, payload });
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
    check: (itemId: string) => append("ItemChecked", { itemId }),
    uncheck: (itemId: string) => append("ItemUnchecked", { itemId }),
    setQuantity: (itemId: string, quantity: number) =>
      append("ItemQuantitySet", { itemId, quantity }),
    removeFromList: (itemId: string) => append("ItemMarkedNotToBuy", { itemId }),
    finishSortie: () => append("SortieFinished", {}),
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
