import { Tabs } from "@base-ui/react/tabs";
import type { Magasin } from "@ecureuil/domain";
import type { ReactNode } from "react";

/** The same magasin as the list: picking one here also picks it there. */
export function MagasinTabs({
  magasins,
  magasinActif,
  selectMagasin,
  children,
}: {
  magasins: ReadonlyArray<Magasin>;
  magasinActif: Magasin;
  selectMagasin: (magasinId: string) => void;
  children: ReactNode;
}) {
  return (
    <Tabs.Root
      value={magasinActif.id}
      onValueChange={(value) => typeof value === "string" && selectMagasin(value)}
    >
      <Tabs.List aria-label="Magasin" className="flex h-12 gap-1 border-b border-neutral-200 px-2">
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
      <Tabs.Panel value={magasinActif.id} className="outline-none">
        {children}
      </Tabs.Panel>
    </Tabs.Root>
  );
}
