import type { Announcements, UniqueIdentifier } from "@dnd-kit/core";
import type { Rayon } from "@ecureuil/domain";
import { useRef } from "react";

export const screenReaderInstructions = {
  draggable:
    "Pour déplacer un rayon, appuyez sur Espace. Les flèches haut et bas le déplacent, Espace le pose à sa nouvelle place, Échap annule.",
};

/**
 * dnd-kit speaks English and reads ids by default: say the rayon's name and position instead.
 * It also reports a drag over the picked rayon's own place right after picking it up, which
 * would cut off « saisi »: only a change of place is spoken.
 */
export function useRayonAnnouncements(rayons: ReadonlyArray<Rayon>): Announcements {
  const lastOverId = useRef<UniqueIdentifier | undefined>(undefined);
  const name = (id: UniqueIdentifier) => rayons.find((rayon) => rayon.id === id)?.name ?? "";
  const position = (id: UniqueIdentifier) =>
    `position ${rayons.findIndex((rayon) => rayon.id === id) + 1} sur ${rayons.length}`;

  return {
    onDragStart: ({ active }) => {
      lastOverId.current = active.id;
      return `${name(active.id)} saisi, ${position(active.id)}.`;
    },
    onDragOver: ({ active, over }) => {
      if (over?.id === lastOverId.current) return undefined;
      lastOverId.current = over?.id;
      return over
        ? `${name(active.id)} en ${position(over.id)}.`
        : `${name(active.id)} hors de la liste.`;
    },
    onDragEnd: ({ active, over }) =>
      `${name(active.id)} posé en ${position(over?.id ?? active.id)}.`,
    onDragCancel: ({ active }) =>
      `Déplacement annulé, ${name(active.id)} reste en ${position(active.id)}.`,
  };
}
