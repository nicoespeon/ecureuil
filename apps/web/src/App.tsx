import { Tabs } from "@base-ui/react/tabs";
import { useRef, useState } from "react";
import type { Journal } from "./journal/journal";
import { useFoyer } from "./journal/useFoyer";
import { ListeView } from "./liste/ListeView";
import { TerminerLesCourses } from "./liste/TerminerLesCourses";

export function App({ journal }: { journal: Journal }) {
  const foyer = useFoyer(journal);
  const [announcement, setAnnouncement] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const { magasins, magasinActif, liste } = foyer;

  if (!magasinActif || !liste) return null;

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
