import { Tabs } from "@base-ui/react/tabs";
import type { Journal } from "./journal/journal";
import { useFoyer } from "./journal/useFoyer";
import { ListeView } from "./liste/ListeView";

export function App({ journal }: { journal: Journal }) {
  const { magasins, magasinActif, liste, selectMagasin } = useFoyer(journal);

  if (!magasinActif || !liste) return null;

  return (
    <Tabs.Root
      value={magasinActif.id}
      onValueChange={(value) => typeof value === "string" && selectMagasin(value)}
      className="mx-auto min-h-dvh max-w-xl bg-white text-neutral-950"
    >
      <header className="sticky top-0 z-20 flex h-14 items-center border-b border-neutral-300 bg-white px-2">
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
      <Tabs.Panel value={magasinActif.id} className="outline-none">
        <ListeView liste={liste} magasinName={magasinActif.name} />
      </Tabs.Panel>
    </Tabs.Root>
  );
}
