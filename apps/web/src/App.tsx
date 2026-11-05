import { Tabs } from "@base-ui/react/tabs";
import type { Liste, Magasin } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { useRef, useState, useSyncExternalStore } from "react";
import { Accueil } from "./acces/Accueil";
import type { AccesStore } from "./acces/acces";
import { CollerLeLien } from "./acces/CollerLeLien";
import { Reglages } from "./acces/Reglages";
import type { Journal } from "./journal/journal";
import { type Foyer, useFoyer } from "./journal/useFoyer";
import { ListeView } from "./liste/ListeView";
import { TerminerLesCourses } from "./liste/TerminerLesCourses";

export function App({
  journal,
  role,
  acces,
}: {
  journal: Journal;
  /** Every event written here carries it: the API refuses any other actor. */
  role: Actor;
  acces: AccesStore;
}) {
  const foyer = useFoyer(journal, role);
  const [reglagesOpen, setReglagesOpen] = useState(false);
  const { magasins, magasinActif, liste } = foyer;

  if (!magasinActif || !liste) return <SansMagasin acces={acces} />;

  return (
    <Tabs.Root
      value={magasinActif.id}
      onValueChange={(value) => {
        if (typeof value !== "string") return;
        foyer.selectMagasin(value);
        setReglagesOpen(false);
      }}
      className="mx-auto min-h-dvh max-w-xl bg-white text-neutral-950"
    >
      <header
        style={{ viewTransitionName: "magasins" }}
        className="sticky top-0 z-20 flex h-14 items-center border-b border-neutral-300 bg-white px-2"
      >
        <h1 className="sr-only">Écureuil</h1>
        <Tabs.List aria-label="Magasin" className="flex h-full gap-1">
          {magasins.map((magasin) => (
            <Tabs.Tab
              key={magasin.id}
              value={magasin.id}
              className="h-full border-b-4 border-transparent px-4 text-base font-medium text-neutral-700 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 data-active:border-neutral-950 data-active:text-neutral-950"
            >
              {magasin.name}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <ReglagesToggle open={reglagesOpen} toggle={() => setReglagesOpen((open) => !open)} />
      </header>
      {reglagesOpen ? (
        <Reglages acces={acces} />
      ) : (
        <MagasinPanel foyer={foyer} magasin={magasinActif} liste={liste} />
      )}
    </Tabs.Root>
  );
}

function MagasinPanel({ foyer, magasin, liste }: { foyer: Foyer; magasin: Magasin; liste: Liste }) {
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <Tabs.Panel ref={panelRef} value={magasin.id} className="outline-none">
        <ListeView
          liste={liste}
          magasinName={magasin.name}
          actions={{
            check: foyer.check,
            uncheck: foyer.uncheck,
            setQuantity: foyer.setQuantity,
            removeFromList: foyer.removeFromList,
            announce: (message) =>
              // A live region only speaks when its text changes: repeat with a nbsp.
              setAnnouncement((previous) => (previous === message ? `${message}\u00a0` : message)),
          }}
        />
      </Tabs.Panel>
      <TerminerLesCourses
        liste={liste}
        finishSortie={foyer.finishSortie}
        focusAfterFinish={panelRef}
      />
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

/** Until the app has a navigation, the réglages open in place of the list. */
function ReglagesToggle({ open, toggle }: { open: boolean; toggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={open}
      onClick={toggle}
      className="ml-auto h-11 rounded-md px-3 text-base font-medium text-neutral-700 outline-none focus-visible:outline-2 focus-visible:outline-blue-700 aria-pressed:bg-neutral-200 aria-pressed:text-neutral-950"
    >
      Réglages
    </button>
  );
}

/** A new device, or one whose first sync has not brought a magasin yet. */
function SansMagasin({ acces }: { acces: AccesStore }) {
  const state = useSyncExternalStore(acces.subscribe, acces.get);

  return (
    <Accueil title="Écureuil">
      <p className="text-lg">Cet appareil n'a encore aucun magasin.</p>
      <p className="text-lg text-neutral-700">
        Ouvrez votre lien d'accès sur cet appareil, ou collez-le ici : votre liste arrive avec la
        synchronisation.
      </p>
      {state._tag === "SansLien" && <CollerLeLien openLien={acces.openLien} />}
    </Accueil>
  );
}
