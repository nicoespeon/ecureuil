import { Tabs } from "@base-ui/react/tabs";
import { type Demande, duplicateOf, type ListItem, pendingDemandes } from "@ecureuil/domain";
import { useId, useRef } from "react";
import { useAnnouncer } from "../config/useAnnouncer";
import type { FoyerWithListe } from "../journal/useFoyer";
import { ListeSection, ListeSections } from "../liste/ListeSections";

/** What the invite sees: the list to read, a field to ask for more, and what still waits. */
export function InvitePanel({ foyer }: { foyer: FoyerWithListe }) {
  const { announcement, announce } = useAnnouncer();
  const { magasinActif: magasin, liste } = foyer;

  return (
    <Tabs.Panel value={magasin.id} className="pb-24 outline-none">
      <AjouterDemande
        askFor={(name) => {
          const duplicate = duplicateOf(foyer.state, name);
          if (duplicate === undefined) foyer.askFor(name);
          announce(duplicate === undefined ? `${name} demandé` : duplicateMessages[duplicate]);
        }}
        message={announcement}
      />
      <MesDemandes demandes={pendingDemandes(foyer.state)} />
      <ListeSections
        liste={liste}
        magasinName={magasin.name}
        toBuyRows={readOnlyRows}
        panierRows={readOnlyRows}
      />
    </Tabs.Panel>
  );
}

/** Why nothing was sent, shown under the field. */
const duplicateMessages = {
  Liste: "Déjà sur la liste",
  Demande: "Déjà demandé",
} satisfies Record<NonNullable<ReturnType<typeof duplicateOf>>, string>;

function AjouterDemande({ askFor, message }: { askFor: (name: string) => void; message: string }) {
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
      <p role="status" className="mt-2 text-sm text-neutral-700 empty:hidden">
        {message}
      </p>
    </div>
  );
}

/** Only what still waits: a verdict is said out loud, not shown. */
function MesDemandes({ demandes }: { demandes: ReadonlyArray<Demande> }) {
  if (demandes.length === 0) return null;
  return (
    <ListeSection id="mes-demandes" title="Mes demandes">
      <ul>
        {demandes.map(({ id, name }) => (
          <li key={id} className="flex min-h-11 items-center border-b border-neutral-200 px-4">
            <span className="min-w-0 truncate">{name}</span>
          </li>
        ))}
      </ul>
    </ListeSection>
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
