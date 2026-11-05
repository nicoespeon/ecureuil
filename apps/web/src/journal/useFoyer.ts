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

  const [preferredMagasinId, setPreferredMagasinId] = useState(() =>
    localStorage.getItem(MAGASIN_ACTIF_KEY),
  );
  const magasinActif =
    (preferredMagasinId === null ? undefined : state.magasins[preferredMagasinId]) ?? magasins[0];

  const append = <T extends EventType>(type: T, payload: PayloadOf<T>) => {
    if (magasinActif) appendProprietaireEvent(journal, type, magasinActif.id, payload);
  };

  return {
    state,
    magasins,
    magasinActif,
    liste: magasinActif && listForMagasin(state, magasinActif.id),
    selectMagasin: (magasinId: string) => {
      // A device preference, not a fact of the foyer: it stays out of the journal.
      localStorage.setItem(MAGASIN_ACTIF_KEY, magasinId);
      setPreferredMagasinId(magasinId);
    },
    check: (itemId: string) => append("ItemChecked", { itemId }),
    uncheck: (itemId: string) => append("ItemUnchecked", { itemId }),
    setQuantity: (itemId: string, quantity: number) =>
      append("ItemQuantitySet", { itemId, quantity }),
    removeFromList: (itemId: string) => append("ItemMarkedNotToBuy", { itemId }),
  };
}
