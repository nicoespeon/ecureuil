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
      <ul ref={listRef} className="list-card">
        {demandes.map((demande) => (
          <li
            key={demande.id}
            className="flex min-h-16 items-center gap-2 border-b-2 border-neutral-100 pr-2 pl-4 last:border-b-0"
          >
            <span className="min-w-0 flex-1 truncate font-bold">{demande.name}</span>
            <button
              type="button"
              data-demande-id={demande.id}
              onClick={() => accept(demande)}
              className={`${buttonClassName} button-primary`}
            >
              Accepter<span className="sr-only"> {demande.name}</span>
            </button>
            <button
              type="button"
              onClick={() => refuse(demande)}
              className={`${buttonClassName} button-secondary`}
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
  "shrink-0 px-4 text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
