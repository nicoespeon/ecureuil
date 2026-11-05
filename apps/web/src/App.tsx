import { Tabs } from "@base-ui/react/tabs";
import { useRef, useState } from "react";
import { ConfigurationView } from "./config/ConfigurationView";
import { useFocusOnMount } from "./config/useFocusOnMount";
import type { Journal } from "./journal/journal";
import { useFoyer } from "./journal/useFoyer";
import { ListeView } from "./liste/ListeView";
import { TerminerLesCourses } from "./liste/TerminerLesCourses";

export function App({ journal }: { journal: Journal }) {
  const foyer = useFoyer(journal);
  const [announcement, setAnnouncement] = useState("");
  const [ecran, setEcran] = useState<"liste" | "configuration" | "retourDeConfiguration">("liste");
  const panelRef = useRef<HTMLDivElement>(null);
  const { magasins, magasinActif, liste } = foyer;

  if (!magasinActif || !liste) return <SansMagasin />;
  if (ecran === "configuration")
    return <ConfigurationView onClose={() => setEcran("retourDeConfiguration")} />;

  return (
    <Tabs.Root
      value={magasinActif.id}
      onValueChange={(value) => typeof value === "string" && foyer.selectMagasin(value)}
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
        <ConfigurationButton
          focusOnMount={ecran === "retourDeConfiguration"}
          onClick={() => setEcran("configuration")}
        />
      </header>
      <Tabs.Panel ref={panelRef} value={magasinActif.id} className="outline-none">
        <ListeView
          liste={liste}
          magasinName={magasinActif.name}
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
    </Tabs.Root>
  );
}

function ConfigurationButton({
  focusOnMount,
  onClick,
}: {
  focusOnMount: boolean;
  onClick: () => void;
}) {
  const ref = useFocusOnMount<HTMLButtonElement>(focusOnMount);
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      className="ml-auto grid size-11 place-items-center rounded-md text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700"
    >
      <GearIcon />
      <span className="sr-only">Configuration</span>
    </button>
  );
}

function GearIcon() {
  return (
    <svg
      aria-hidden="true"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/** A new device, or one whose first sync has not brought a magasin yet. */
function SansMagasin() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-xl flex-col justify-center gap-4 bg-white px-6 text-neutral-950">
      <h1 className="text-3xl font-semibold">Écureuil</h1>
      <p className="text-lg">Cet appareil n'a encore aucun magasin.</p>
      <p className="text-lg text-neutral-700">
        Ouvrez votre lien d'accès sur cet appareil, en le collant dans la barre d'adresse : la liste
        du foyer arrive avec la synchronisation.
      </p>
    </main>
  );
}
