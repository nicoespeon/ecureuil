import type { Demande } from "@ecureuil/domain";
import { type RefObject, useLayoutEffect, useRef } from "react";

/**
 * A demande that leaves its list (decided, withdrawn) would take the keyboard focus with it: the
 * focus goes to the next demande's button marked `data-demande-id`, or the previous one, or to
 * `focusAfterLast` after the last.
 */
export function useFocusNextDemande(focusAfterLast: RefObject<HTMLElement | null>) {
  const listRef = useRef<HTMLUListElement>(null);
  const neighbor = useRef<{ readonly demandeId: string | undefined } | undefined>(undefined);

  useLayoutEffect(() => {
    if (neighbor.current === undefined) return;
    const { demandeId } = neighbor.current;
    neighbor.current = undefined;
    const button = [
      ...(listRef.current?.querySelectorAll<HTMLButtonElement>("button[data-demande-id]") ?? []),
    ].find((candidate) => candidate.dataset.demandeId === demandeId);
    (button ?? focusAfterLast.current)?.focus({ preventScroll: true });
  });

  return {
    listRef,
    focusNeighborOf: (demandes: ReadonlyArray<Demande>, demande: Demande) => {
      const index = demandes.indexOf(demande);
      neighbor.current = { demandeId: (demandes[index + 1] ?? demandes[index - 1])?.id };
    },
  };
}
