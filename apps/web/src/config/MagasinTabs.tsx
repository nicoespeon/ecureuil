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
      <div className="flex h-16 items-center px-2">
        <Tabs.List
          ref={listRef}
          aria-label="Magasin"
          className="flex min-w-0 items-center gap-1 overflow-x-auto px-1 py-2"
        >
          {magasins.map((magasin) => (
            <Tabs.Tab
              key={magasin.id}
              value={magasin.id}
              className="h-11 shrink-0 whitespace-nowrap rounded-full px-4 text-base font-bold text-neutral-700 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-active:clay data-active:font-extrabold data-active:text-neutral-950"
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
  "clay grid size-11 shrink-0 self-center place-items-center rounded-full text-2xl font-bold text-neutral-900 focus-visible:outline-2 focus-visible:outline-blue-700";
