import { Tabs } from "@base-ui/react/tabs";
import type { Magasin } from "@ecureuil/domain";
import { type ReactNode, useEffect, useRef } from "react";
import { NouveauMagasin } from "./NouveauMagasin";
import type { FocusRequest } from "./useFocusRequest";

/** The same magasin as the list: picking one here also picks it there. */
export function MagasinTabs({
  magasins,
  magasinActif,
  selectMagasin,
  createMagasin,
  focus,
  children,
}: {
  magasins: ReadonlyArray<Magasin>;
  magasinActif: Magasin;
  selectMagasin: (magasinId: string) => void;
  createMagasin: (name: string) => void;
  focus: FocusRequest<"onglet" | "nom">;
  children: ReactNode;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (focus.take("onglet"))
      listRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.focus();
  });

  return (
    <Tabs.Root
      value={magasinActif.id}
      onValueChange={(value) => typeof value === "string" && selectMagasin(value)}
    >
      <div className="flex h-12 items-stretch border-b border-neutral-200 px-2">
        <Tabs.List
          ref={listRef}
          aria-label="Magasin"
          className="flex min-w-0 gap-1 overflow-x-auto"
        >
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
        <NouveauMagasin
          create={createMagasin}
          trigger={{
            className: plusClassName,
            label: (
              <>
                <span aria-hidden="true">+</span>
                <span className="sr-only">Nouveau magasin</span>
              </>
            ),
          }}
        />
      </div>
      <Tabs.Panel value={magasinActif.id} className="outline-none">
        {children}
      </Tabs.Panel>
    </Tabs.Root>
  );
}

const plusClassName =
  "my-0.5 grid w-11 shrink-0 place-items-center rounded-md text-2xl font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";
