import type { Demande } from "@ecureuil/domain";
import type { RefObject } from "react";
import { ListeSection } from "./ListeSections";
import { useFocusNextDemande } from "./useFocusNextDemande";

type Actions = {
  readonly acceptDemande: (demande: Demande) => void;
  readonly refuseDemande: (demande: Demande) => void;
  readonly announce: (message: string) => void;
};

/** The invite's demandes waiting for a verdict, at the head of the list. */
export function AValider({
  demandes,
  actions,
  focusAfterLast,
}: {
  demandes: ReadonlyArray<Demande>;
  actions: Actions;
  focusAfterLast: RefObject<HTMLElement | null>;
}) {
  const { listRef, focusNeighborOf } = useFocusNextDemande(focusAfterLast);
  if (demandes.length === 0) return null;

  const accept = (demande: Demande) => {
    focusNeighborOf(demandes, demande);
    actions.acceptDemande(demande);
    actions.announce(`${demande.name} ajouté à la liste`);
  };
  const refuse = (demande: Demande) => {
    focusNeighborOf(demandes, demande);
    actions.refuseDemande(demande);
    actions.announce(`${demande.name} refusé`);
  };

  return (
    <ListeSection id="a-valider" title={`À valider (${demandes.length})`}>
      <ul ref={listRef}>
        {demandes.map((demande) => (
          <li
            key={demande.id}
            className="flex min-h-14 items-center gap-2 border-b border-neutral-200 pr-2 pl-4"
          >
            <span className="min-w-0 flex-1 truncate">{demande.name}</span>
            <button
              type="button"
              data-demande-id={demande.id}
              onClick={() => accept(demande)}
              className={`${buttonClassName} bg-neutral-900 text-white`}
            >
              Accepter<span className="sr-only"> {demande.name}</span>
            </button>
            <button
              type="button"
              onClick={() => refuse(demande)}
              className={`${buttonClassName} border border-neutral-400 text-neutral-900 hover:bg-neutral-100`}
            >
              Refuser<span className="sr-only"> {demande.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </ListeSection>
  );
}

const buttonClassName =
  "h-11 shrink-0 rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
