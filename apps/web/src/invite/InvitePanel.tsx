import { Tabs } from "@base-ui/react/tabs";
import { type Demande, type DemandeStatus, type ListItem, latestDemandes } from "@ecureuil/domain";
import { useId, useRef } from "react";
import { useAnnouncer } from "../config/useAnnouncer";
import type { FoyerWithListe } from "../journal/useFoyer";
import { ListeSection, ListeSections } from "../liste/ListeSections";

/** Enough to see what became of this week's demandes without scrolling past the list. */
const MES_DEMANDES_COUNT = 10;

/** What the invite sees: the list to read, a field to ask for more, and the fate of each demande. */
export function InvitePanel({ foyer }: { foyer: FoyerWithListe }) {
  const { announcement, announce } = useAnnouncer();
  const { magasinActif: magasin, liste } = foyer;

  return (
    <>
      <Tabs.Panel value={magasin.id} className="pb-24 outline-none">
        <AjouterDemande
          askFor={(name) => {
            foyer.askFor(name);
            announce(`${name} demandé`);
          }}
        />
        <MesDemandes demandes={latestDemandes(foyer.state, MES_DEMANDES_COUNT)} />
        <ListeSections
          liste={liste}
          magasinName={magasin.name}
          toBuyRows={readOnlyRows}
          panierRows={readOnlyRows}
        />
      </Tabs.Panel>
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

function AjouterDemande({ askFor }: { askFor: (name: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  return (
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
      className="flex gap-2 border-b border-neutral-200 p-4"
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
  );
}

const statusLabels = {
  Pending: "en attente",
  Accepted: "dans la liste",
  Refused: "pas cette fois",
} satisfies Record<DemandeStatus["_tag"], string>;

const statusClassNames = {
  Pending: "bg-amber-100 text-amber-900",
  Accepted: "bg-green-100 text-green-900",
  Refused: "bg-neutral-100 text-neutral-700",
} satisfies Record<DemandeStatus["_tag"], string>;

function MesDemandes({ demandes }: { demandes: ReadonlyArray<Demande> }) {
  if (demandes.length === 0) return null;
  return (
    <ListeSection id="mes-demandes" title="Mes demandes">
      <ul>
        {demandes.map(({ id, name, status }) => (
          <li
            key={id}
            className="flex min-h-11 items-center justify-between gap-2 border-b border-neutral-200 px-4"
          >
            <span className="min-w-0 truncate">{name}</span>
            <span
              className={`shrink-0 rounded-full px-2 py-0.5 text-sm ${statusClassNames[status._tag]}`}
            >
              <span className="sr-only">, </span>
              {statusLabels[status._tag]}
            </span>
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
