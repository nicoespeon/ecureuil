import { Tabs } from "@base-ui/react/tabs";
import { type Demande, duplicateOf, type ListArticle, pendingDemandes } from "@ecureuil/domain";
import { type RefObject, useId, useRef, useState } from "react";
import { useAnnouncer } from "../config/useAnnouncer";
import type { FoyerWithListe } from "../journal/useFoyer";
import { TrashIcon } from "../liste/ArticleRow";
import { ListeSections } from "../liste/ListeSections";
import { useFocusNextDemande } from "../liste/useFocusNextDemande";

/** What the invite sees: the list to read, a field to ask for more, and what still waits. */
export function InvitePanel({ foyer }: { foyer: FoyerWithListe }) {
  const { announcement, announce } = useAnnouncer();
  const [duplicate, setDuplicate] = useState<Duplicate>();
  const inputRef = useRef<HTMLInputElement>(null);
  const { magasinActif: magasin, liste } = foyer;

  return (
    <Tabs.Panel value={magasin.id} className="pb-24 outline-none">
      <AjouterDemande
        inputRef={inputRef}
        askFor={(name) => {
          const found = duplicateOf(foyer.state, name);
          setDuplicate(found);
          if (found === undefined) foyer.askFor(name);
          announce(found === undefined ? `${name} demandé` : duplicateMessages[found]);
        }}
        message={announcement}
        // The new demande at the top of "Mes demandes" says it all; only a refusal needs words.
        showMessage={duplicate !== undefined}
      />
      <MesDemandes
        demandes={pendingDemandes(foyer.state).toReversed()}
        withdraw={(demande) => {
          setDuplicate(undefined);
          foyer.withdrawDemande(demande);
          announce(`${demande.name} retiré`);
        }}
        focusAfterLast={inputRef}
      />
      <ListeSections
        liste={liste}
        magasinName={magasin.name}
        toBuyRows={readOnlyRows}
        panierRows={readOnlyRows}
      />
    </Tabs.Panel>
  );
}

type Duplicate = NonNullable<ReturnType<typeof duplicateOf>>;

/** Why nothing was sent, shown under the field. */
const duplicateMessages = {
  Liste: "Déjà sur la liste",
  Demande: "Déjà demandé",
} satisfies Record<Duplicate, string>;

function AjouterDemande({
  inputRef,
  askFor,
  message,
  showMessage,
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  askFor: (name: string) => void;
  message: string;
  showMessage: boolean;
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
      <p role="status" className={showMessage ? "mt-2 text-sm text-neutral-700" : "sr-only"}>
        {message}
      </p>
    </div>
  );
}

/**
 * Only what still waits: a verdict is said out loud, not shown. A tinted card, newest first, so
 * it does not read as one more rayon of the list.
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
  if (demandes.length === 0) return null;
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

function readOnlyRows(articles: ReadonlyArray<ListArticle>) {
  return (
    <ul className="pebble-list mx-3">
      {articles.map((article) => (
        <li
          key={article.id}
          className="flex min-h-14 items-center border-b-2 border-neutral-100 px-4 font-bold last:border-b-0"
        >
          <span className="min-w-0 truncate">{article.name}</span>
          {article.quantity > 1 && (
            <span className="ml-2 rounded-full bg-(--t-100) px-2 text-sm font-extrabold text-(--t-900)">
              <span aria-hidden="true">×{article.quantity}</span>
              <span className="sr-only">quantité {article.quantity}</span>
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}
