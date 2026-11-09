import { type Demande, duplicateOf, pendingDemandes } from "@ecureuil/domain";
import { type RefObject, useId, useRef } from "react";
import type { FoyerWithListe } from "../journal/useFoyer";
import { TrashIcon } from "../liste/ArticleRow";
import { Ecureuil } from "../liste/Ecureuil";
import { useFocusNextDemande } from "../liste/useFocusNextDemande";
import { useMessage } from "../message/Message";

/**
 * What the invite sees: a field to ask, and what still waits. No magasin and no list, so
 * nothing reads as a choice of where to buy.
 */
export function InviteScreen({ foyer }: { foyer: FoyerWithListe }) {
  const showMessage = useMessage();
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="mx-auto min-h-dvh max-w-xl">
      <header className="flex h-16 items-center gap-2 border-b-2 border-neutral-200 px-4">
        <Ecureuil size={40} />
        <h1 className="text-2xl font-black">Écureuil</h1>
      </header>
      <main className="pb-8">
        <AjouterDemande
          inputRef={inputRef}
          askFor={(name) => {
            const found = duplicateOf(foyer.state, name);
            if (found === undefined) foyer.askFor(name);
            showMessage(found === undefined ? `${name} demandé` : duplicateMessages[found]);
          }}
        />
        <MesDemandes
          demandes={pendingDemandes(foyer.state).toReversed()}
          withdraw={(demande) => {
            foyer.withdrawDemande(demande);
            showMessage(`${demande.name} retiré`);
          }}
          focusAfterLast={inputRef}
        />
      </main>
    </div>
  );
}

type Duplicate = NonNullable<ReturnType<typeof duplicateOf>>;

/** Why nothing was sent. */
const duplicateMessages = {
  Liste: "Déjà sur la liste",
  Demande: "Déjà demandé",
} satisfies Record<Duplicate, string>;

function AjouterDemande({
  inputRef,
  askFor,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  askFor: (name: string) => void;
}) {
  const inputId = useId();

  return (
    <div className="p-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          const input = inputRef.current;
          const name = input?.value.trim();
          if (!input || !name) return;
          askFor(name);
          input.value = "";
          // Back to the field, keyboard still open, for the next demande.
          input.focus();
        }}
        className="flex gap-2"
      >
        <label htmlFor={inputId} className="sr-only">
          Nom
        </label>
        <input
          ref={inputRef}
          id={inputId}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Ce qu'il faut acheter"
          className="clay-well min-h-12 min-w-0 flex-1 rounded-full bg-white px-4 text-base font-semibold placeholder:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
        <button
          type="submit"
          className="button-primary shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        >
          Ajouter
        </button>
      </form>
    </div>
  );
}

/**
 * Only what still waits: a verdict is said out loud, not shown. A tinted card, newest first. Empty,
 * it says what the field is for.
 */
function MesDemandes({
  demandes,
  withdraw,
  focusAfterLast,
}: {
  demandes: ReadonlyArray<Demande>;
  withdraw: (demande: Demande) => void;
  focusAfterLast: RefObject<HTMLElement | null>;
}) {
  const headingId = useId();
  const { listRef, focusNeighborOf } = useFocusNextDemande(focusAfterLast);
  if (demandes.length === 0)
    return (
      <p className="px-6 text-neutral-700">
        Écrivez ce qu'il manque : vos demandes attendent ici qu'on les mette sur la liste.
      </p>
    );
  return (
    <section aria-labelledby={headingId} className="clay mx-3 mb-2 rounded-pebble bg-amber-50">
      <h2
        id={headingId}
        className="px-4 pt-3 pb-1 text-sm font-black tracking-wide text-amber-900 uppercase"
      >
        Mes demandes
      </h2>
      <ul ref={listRef}>
        {demandes.map((demande) => (
          <li
            key={demande.id}
            className="flex min-h-12 items-center border-t-2 border-amber-100 pr-1 pl-4 font-bold first:border-t-0"
          >
            <span className="min-w-0 flex-1 truncate">{demande.name}</span>
            <button
              type="button"
              data-demande-id={demande.id}
              onClick={() => {
                focusNeighborOf(demandes, demande);
                withdraw(demande);
              }}
              className="grid size-11 shrink-0 place-items-center rounded-full text-neutral-900 hover:bg-amber-100 focus-visible:outline-2 focus-visible:outline-blue-700"
            >
              <TrashIcon />
              <span className="sr-only">Retirer {demande.name}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
