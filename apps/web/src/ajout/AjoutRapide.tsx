import { Dialog } from "@base-ui/react/dialog";
import type { Item, Magasin } from "@ecureuil/domain";
import { type ReactNode, type RefObject, useId, useRef, useState } from "react";
import type { Writer } from "../config/configActions";
import { useFicheItem } from "../config/FicheItem";
import { useAnnouncer } from "../config/useAnnouncer";
import type { Foyer } from "../journal/useFoyer";
import { frequentItems, searchItems } from "./suggestions";

type AjoutFoyer = Pick<Foyer, "state" | "magasins" | "markToBuy" | "createItem"> & {
  readonly magasinActif: Magasin;
};

/** Adds an item to the list in a few keystrokes: a frequent one, a found one, or a new one. */
export function AjoutRapide({ foyer, writer }: { foyer: AjoutFoyer; writer: Writer }) {
  const searchRef = useRef<HTMLInputElement>(null);
  // A new item needs its rayons: its sheet opens over the panel, then hands the field back.
  const { openFiche, fiche } = useFicheItem({
    foyer,
    writer,
    focusAfterRemove: searchRef,
    focusAfterClose: searchRef,
  });

  return (
    <Dialog.Root>
      <Dialog.Trigger
        className={`${buttonClassName} grow whitespace-nowrap border border-neutral-400 bg-white`}
      >
        <span aria-hidden="true" className="mr-2">
          +
        </span>
        Ajouter
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-black/40" />
        <Dialog.Popup
          initialFocus={searchRef}
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-white text-neutral-950 sm:inset-auto sm:top-8 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:w-[28rem] sm:-translate-x-1/2 sm:rounded-lg sm:shadow-xl"
        >
          <AjoutPanel foyer={foyer} searchRef={searchRef} openFiche={openFiche} />
          {fiche}
        </Dialog.Popup>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function AjoutPanel({
  foyer,
  searchRef,
  openFiche,
}: {
  foyer: AjoutFoyer;
  searchRef: RefObject<HTMLInputElement | null>;
  openFiche: (itemId: string) => void;
}) {
  const ajout = useAjout(foyer, { searchRef, openFiche });
  const magasin = foyer.magasinActif;

  return (
    <>
      <div className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-300 px-4">
        <Dialog.Title className="flex-1 text-lg font-semibold">Ajouter à la liste</Dialog.Title>
        <Dialog.Close className={closeClassName}>Fermer</Dialog.Close>
      </div>
      <form
        className="p-4"
        onSubmit={(event) => {
          event.preventDefault();
          ajout.addOnEnter();
        }}
      >
        <input
          ref={searchRef}
          type="search"
          aria-label="Item à ajouter"
          placeholder="Chercher ou créer un item"
          autoComplete="off"
          enterKeyHint="done"
          value={ajout.query}
          onChange={(event) => ajout.search(event.currentTarget.value)}
          className="h-12 w-full rounded-md border border-neutral-400 bg-white px-3 text-base focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-700"
        />
      </form>
      {ajout.query.trim() === "" ? (
        <Frequents
          items={frequentItems(foyer.state, magasin.id)}
          magasin={magasin}
          add={ajout.add}
        />
      ) : (
        <Results {...ajout.result} magasin={magasin} add={ajout.add} create={ajout.create} />
      )}
      <p role="status" className="sr-only">
        {ajout.announcement}
      </p>
    </>
  );
}

/** What the panel's gestures do: write to the journal, then say so and get ready for the next. */
function useAjout(
  foyer: AjoutFoyer,
  {
    searchRef,
    openFiche,
  }: { searchRef: RefObject<HTMLInputElement | null>; openFiche: (itemId: string) => void },
) {
  const [query, setQuery] = useState("");
  const { announcement, announce } = useAnnouncer();
  const result = searchItems(foyer.state, query);

  // The tapped row disappears: the focus goes back to the field, ready for the next item.
  const added = (name: string) => {
    setQuery("");
    announce(`Sur la liste : ${name}`);
    searchRef.current?.focus();
  };
  const add = (item: Item) => {
    foyer.markToBuy(item.id);
    added(item.name);
  };
  const create = (name: string) => {
    const itemId = foyer.createItem(name);
    added(name);
    openFiche(itemId);
  };

  return {
    query,
    result,
    announcement,
    add,
    create,
    search: (next: string) => {
      setQuery(next);
      if (next.trim() !== "") announce(itemsFound(searchItems(foyer.state, next).items.length));
    },
    // The exact name wins: Enter on « lait » never adds Laitue when Lait is already on the list.
    addOnEnter: () => {
      const { items, exactMatch, nameToCreate } = result;
      const choice = exactMatch ?? items.find((item) => item.status === "notToBuy");
      if (choice?.status === "notToBuy") add(choice);
      else if (choice) announce(`Déjà sur la liste : ${choice.name}`);
      else if (nameToCreate !== null) create(nameToCreate);
    },
  };
}

function Results({
  items,
  nameToCreate,
  magasin,
  add,
  create,
}: {
  items: ReadonlyArray<Item>;
  nameToCreate: string | null;
  magasin: Magasin;
  add: (item: Item) => void;
  create: (name: string) => void;
}) {
  return (
    <ul aria-label="Résultats">
      {items.map((item) => (
        <li key={item.id}>
          <ItemOption item={item} magasin={magasin} add={add} />
        </li>
      ))}
      {nameToCreate !== null && (
        <li>
          <AddButton onClick={() => create(nameToCreate)}>
            <span className="min-w-0 flex-1 truncate">Créer « {nameToCreate} »</span>
          </AddButton>
        </li>
      )}
    </ul>
  );
}

function Frequents({
  items,
  magasin,
  add,
}: {
  items: ReadonlyArray<Item>;
  magasin: Magasin;
  add: (item: Item) => void;
}) {
  const headingId = useId();
  if (items.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h2 id={headingId} className="px-4 pb-1 text-sm font-semibold text-neutral-800">
        Fréquents
      </h2>
      <ul>
        {items.map((item) => (
          <li key={item.id}>
            <ItemOption item={item} magasin={magasin} add={add} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** An item off the list is one tap away; one already on it only says where it is. */
function ItemOption({
  item,
  magasin,
  add,
}: {
  item: Item;
  magasin: Magasin;
  add: (item: Item) => void;
}) {
  const pasVenduIci = item.rayonParMagasin[magasin.id]?._tag === "PasVenduIci";
  const details = [
    item.status === "toBuy" && "Sur la liste",
    item.status === "inCart" && "Dans le panier",
    pasVenduIci && `Pas chez ${magasin.name}`,
  ].filter((detail) => typeof detail === "string");
  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{item.name}</span>
      {details.length > 0 && (
        <span className="shrink-0 text-sm text-neutral-700">{details.join(" · ")}</span>
      )}
    </>
  );

  return item.status === "notToBuy" ? (
    <AddButton onClick={() => add(item)}>{content}</AddButton>
  ) : (
    <div className={`${rowLayoutClassName} text-neutral-700`}>{content}</div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${rowLayoutClassName} hover:bg-neutral-100 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700`}
    >
      {children}
      <span aria-hidden="true" className="shrink-0 text-xl leading-none">
        +
      </span>
    </button>
  );
}

const plural = new Intl.PluralRules("fr");

function itemsFound(count: number) {
  if (count === 0) return "Aucun item trouvé";
  return plural.select(count) === "one" ? `${count} item trouvé` : `${count} items trouvés`;
}

const buttonClassName =
  "h-12 rounded-md px-4 text-base font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const closeClassName =
  "h-11 shrink-0 rounded-md px-3 text-base font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const rowLayoutClassName =
  "flex min-h-12 w-full items-center gap-3 border-b border-neutral-200 px-4 text-left text-base";
