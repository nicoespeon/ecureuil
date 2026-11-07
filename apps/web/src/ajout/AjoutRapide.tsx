import { Dialog } from "@base-ui/react/dialog";
import type { Article, Magasin } from "@ecureuil/domain";
import { type ReactNode, type RefObject, useEffect, useId, useRef, useState } from "react";
import type { Writer } from "../config/configActions";
import { useFicheArticle } from "../config/FicheArticle";
import { useAnnouncer } from "../config/useAnnouncer";
import type { Foyer } from "../journal/useFoyer";
import { frequentArticles, searchArticles } from "./suggestions";

const TYPING_PAUSE_MS = 500;

type AjoutFoyer = Pick<Foyer, "state" | "magasins" | "markToBuy" | "createArticle"> & {
  readonly magasinActif: Magasin;
};

/** Adds an article to the list in a few keystrokes: a frequent one, a found one, or a new one. */
export function AjoutRapide({ foyer, writer }: { foyer: AjoutFoyer; writer: Writer }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const announcer = useAnnouncer();
  // A new article needs its rayons: its sheet opens over the panel, then hands the field back.
  const { openFiche, fiche } = useFicheArticle({
    foyer,
    writer,
    announce: announcer.announce,
    focusAfterRemove: searchRef,
    focusAfterClose: searchRef,
  });

  return (
    // The panel's live region opens silent, not with the last opening's words.
    <Dialog.Root onOpenChange={(open) => open && announcer.clear()}>
      <Dialog.Trigger className="button-primary h-14 grow whitespace-nowrap text-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700">
        <span aria-hidden="true" className="mr-2">
          +
        </span>
        Ajouter
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-30 bg-neutral-950/40" />
        <Dialog.Popup
          initialFocus={searchRef}
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-neutral-100 pb-4 text-neutral-950 sm:inset-auto sm:top-8 sm:left-1/2 sm:max-h-[calc(100dvh-4rem)] sm:w-[28rem] sm:-translate-x-1/2 sm:rounded-pebble sm:shadow-xl"
        >
          <AjoutPanel
            foyer={foyer}
            searchRef={searchRef}
            openFiche={openFiche}
            announcer={announcer}
          />
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
  announcer,
}: {
  foyer: AjoutFoyer;
  searchRef: RefObject<HTMLInputElement | null>;
  openFiche: (articleId: string) => void;
  announcer: ReturnType<typeof useAnnouncer>;
}) {
  const ajout = useAjout(foyer, { searchRef, openFiche, announce: announcer.announce });
  const magasin = foyer.magasinActif;

  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-2 px-4">
        <Dialog.Title className="flex-1 text-xl font-black">Ajouter à la liste</Dialog.Title>
        <Dialog.Close className={closeClassName}>Fermer</Dialog.Close>
      </div>
      <form
        className="px-4 pb-4"
        onSubmit={(event) => {
          event.preventDefault();
          ajout.addOnEnter();
        }}
      >
        <input
          ref={searchRef}
          type="search"
          aria-label="Article à ajouter"
          placeholder="Chercher ou créer un article"
          autoComplete="off"
          enterKeyHint="done"
          value={ajout.query}
          onChange={(event) => ajout.search(event.currentTarget.value)}
          className="clay-well h-14 w-full rounded-full bg-white px-5 text-lg font-semibold placeholder:text-neutral-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
        />
      </form>
      {ajout.query.trim() === "" ? (
        <Frequents
          articles={frequentArticles(foyer.state, magasin.id)}
          magasin={magasin}
          add={ajout.add}
        />
      ) : (
        <Results {...ajout.result} magasin={magasin} add={ajout.add} create={ajout.create} />
      )}
      <p role="status" className="sr-only">
        {announcer.announcement}
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
    announce,
  }: {
    searchRef: RefObject<HTMLInputElement | null>;
    openFiche: (articleId: string) => void;
    announce: (message: string) => void;
  },
) {
  const [query, setQuery] = useState("");
  const result = searchArticles(foyer.state, query);
  const countAnnouncement = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(countAnnouncement.current), []);
  // An answer to a gesture wins over the count still waiting for the typing to pause.
  const say = (message: string) => {
    clearTimeout(countAnnouncement.current);
    announce(message);
  };

  // The tapped row disappears: the focus goes back to the field, ready for the next article.
  const added = (name: string) => {
    setQuery("");
    say(`Sur la liste : ${name}`);
    searchRef.current?.focus();
  };
  const add = (article: Article) => {
    foyer.markToBuy(article.id);
    added(article.name);
  };
  const create = (name: string) => {
    const articleId = foyer.createArticle(name);
    added(name);
    openFiche(articleId);
  };

  return {
    query,
    result,
    add,
    create,
    search: (next: string) => {
      setQuery(next);
      clearTimeout(countAnnouncement.current);
      // Spoken once typing pauses: a count per keystroke would talk over the keyboard's echo.
      if (next.trim() !== "")
        countAnnouncement.current = setTimeout(
          () => announce(articlesFound(searchArticles(foyer.state, next).articles.length)),
          TYPING_PAUSE_MS,
        );
    },
    // The exact name wins: Enter on « lait » never adds Laitue when Lait is already on the list.
    addOnEnter: () => {
      const { articles, exactMatch, nameToCreate } = result;
      const choice = exactMatch ?? articles.find((article) => article.status === "notToBuy");
      if (choice?.status === "notToBuy") add(choice);
      else if (choice) say(`Déjà sur la liste : ${choice.name}`);
      else if (nameToCreate !== null) create(nameToCreate);
    },
  };
}

function Results({
  articles,
  nameToCreate,
  magasin,
  add,
  create,
}: {
  articles: ReadonlyArray<Article>;
  nameToCreate: string | null;
  magasin: Magasin;
  add: (article: Article) => void;
  create: (name: string) => void;
}) {
  return (
    <ul aria-label="Résultats" className="pebble-list mx-3">
      {articles.map((article) => (
        <li key={article.id}>
          <ArticleOption article={article} magasin={magasin} add={add} />
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
  articles,
  magasin,
  add,
}: {
  articles: ReadonlyArray<Article>;
  magasin: Magasin;
  add: (article: Article) => void;
}) {
  const headingId = useId();
  if (articles.length === 0) return null;

  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="px-5 pb-2 text-sm font-black tracking-wide text-neutral-700 uppercase"
      >
        Fréquents
      </h2>
      <ul className="pebble-list mx-3">
        {articles.map((article) => (
          <li key={article.id}>
            <ArticleOption article={article} magasin={magasin} add={add} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** An article off the list is one tap away; one already on it only says where it is. */
function ArticleOption({
  article,
  magasin,
  add,
}: {
  article: Article;
  magasin: Magasin;
  add: (article: Article) => void;
}) {
  const pasVenduIci = article.rayonParMagasin[magasin.id]?._tag === "PasVenduIci";
  const details = [
    article.status === "toBuy" && "Sur la liste",
    article.status === "inCart" && "Dans le panier",
    pasVenduIci && `Pas chez ${magasin.name}`,
  ].filter((detail) => typeof detail === "string");
  const content = (
    <>
      <span className="min-w-0 flex-1 truncate">{article.name}</span>
      {details.length > 0 && (
        <span className="shrink-0 text-sm font-semibold text-neutral-700">
          {details.join(" · ")}
        </span>
      )}
    </>
  );

  return article.status === "notToBuy" ? (
    <AddButton onClick={() => add(article)}>{content}</AddButton>
  ) : (
    <div className={`${rowLayoutClassName} text-neutral-700`}>{content}</div>
  );
}

function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${rowLayoutClassName} font-bold hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700`}
    >
      {children}
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-roux text-xl leading-none font-black text-white"
      >
        +
      </span>
    </button>
  );
}

const plural = new Intl.PluralRules("fr");

function articlesFound(count: number) {
  if (count === 0) return "Aucun article trouvé";
  return plural.select(count) === "one" ? `${count} article trouvé` : `${count} articles trouvés`;
}

const closeClassName =
  "button-secondary shrink-0 px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const rowLayoutClassName =
  "flex min-h-14 w-full items-center gap-3 border-b-2 border-neutral-100 px-4 text-left text-base in-[li:last-child]:border-b-0 rounded-[inherit]";
