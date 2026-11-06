import { Tabs } from "@base-ui/react/tabs";
import { type Demande, duplicateOf, type ListItem, pendingDemandes } from "@ecureuil/domain";
import { useId, useRef, useState } from "react";
import { useAnnouncer } from "../config/useAnnouncer";
import type { FoyerWithListe } from "../journal/useFoyer";
import { ListeSections } from "../liste/ListeSections";

/** What the invite sees: the list to read, a field to ask for more, and what still waits. */
export function InvitePanel({ foyer }: { foyer: FoyerWithListe }) {
  const { announcement, announce } = useAnnouncer();
  const [duplicate, setDuplicate] = useState<Duplicate>();
  const { magasinActif: magasin, liste } = foyer;

  return (
    <Tabs.Panel value={magasin.id} className="pb-24 outline-none">
      <AjouterDemande
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
      <MesDemandes demandes={pendingDemandes(foyer.state).toReversed()} />
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
  askFor,
  message,
  showMessage,
}: {
  askFor: (name: string) => void;
  message: string;
  showMessage: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
    <div className="border-b border-neutral-200 p-4">
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
          className="min-h-11 min-w-0 flex-1 rounded-md border border-neutral-400 px-3 text-base focus-visible:outline-2 focus-visible:outline-blue-700"
        />
        <button
          type="submit"
          className="min-h-11 shrink-0 rounded-md bg-neutral-900 px-4 font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
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
function MesDemandes({ demandes }: { demandes: ReadonlyArray<Demande> }) {
  const headingId = useId();
  if (demandes.length === 0) return null;
  return (
    <section
      aria-labelledby={headingId}
      className="mx-4 my-4 rounded-lg border border-amber-300 bg-amber-50"
    >
      <h2 id={headingId} className="px-4 pt-3 pb-1 font-semibold text-amber-900">
        Mes demandes
      </h2>
      <ul>
        {demandes.map(({ id, name }) => (
          <li
            key={id}
            className="flex min-h-11 items-center border-t border-amber-200 px-4 first:border-t-0"
          >
            <span className="min-w-0 truncate">{name}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

function readOnlyRows(items: ReadonlyArray<ListItem>) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id} className="flex min-h-11 items-center border-b border-neutral-200 px-4">
          <span className="min-w-0 truncate">{item.name}</span>
          {item.quantity > 1 && <span className="ml-1 text-neutral-700">×{item.quantity}</span>}
        </li>
      ))}
    </ul>
  );
}
