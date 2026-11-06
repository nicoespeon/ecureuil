import { Tabs } from "@base-ui/react/tabs";
import type { Magasin } from "@ecureuil/domain";
import { useState } from "react";
import type { AccesStore } from "../acces/acces";
import { Reglages } from "../acces/Reglages";
import { configActions, createMagasin, type Writer } from "./configActions";
import { type FicheFoyer, useFicheItem } from "./FicheItem";
import { ItemsView } from "./ItemsView";
import { MagasinTabs } from "./MagasinTabs";
import { RayonsView } from "./RayonsView";

import { useAnnouncer } from "./useAnnouncer";
import { useFocusOnMount } from "./useFocusOnMount";
import { useFocusRequest } from "./useFocusRequest";
import { useMediaQuery } from "./useMediaQuery";

type Foyer = FicheFoyer & { readonly selectMagasin: (magasinId: string) => void };

export function ConfigurationView({
  foyer,
  writer,
  acces,
  onClose,
}: {
  foyer: Foyer;
  writer: Writer;
  acces: AccesStore;
  onClose: () => void;
}) {
  const titleRef = useFocusOnMount<HTMLHeadingElement>();
  const { announcement, announce } = useAnnouncer();
  // The sections become a sidebar at the `md` breakpoint: arrow keys follow the layout.
  const sidebar = useMediaQuery("(min-width: 48rem)");
  const { openFiche, fiche } = useFicheItem({ foyer, writer, focusAfterRemove: titleRef });
  const [section, setSection] = useState("rayons");
  const magasinActions = useMagasinActions({
    foyer,
    writer,
    announce,
    showRayons: () => setSection("rayons"),
  });
  const actions = {
    ...configActions(writer, foyer.magasinActif.id),
    ...magasinActions,
    announce,
    openFiche,
  };

  return (
    <div className="mx-auto min-h-dvh max-w-5xl bg-white text-neutral-950">
      <header className="sticky top-0 z-20 flex h-14 items-center gap-2 border-b border-neutral-300 bg-white px-2">
        <button type="button" onClick={onClose} className={headerButtonClassName}>
          <span aria-hidden="true">←</span> Liste
        </button>
        <h1 ref={titleRef} tabIndex={-1} className="text-lg font-semibold outline-none">
          Configuration
        </h1>
      </header>
      <Tabs.Root
        value={section}
        onValueChange={(value) => typeof value === "string" && setSection(value)}
        orientation={sidebar ? "vertical" : "horizontal"}
        className="md:flex"
      >
        <Tabs.List
          aria-label="Section"
          className="flex border-b border-neutral-300 md:w-48 md:shrink-0 md:flex-col md:border-r md:border-b-0"
        >
          {sections.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} className={sectionTabClassName}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="rayons" className={panelClassName}>
          <MagasinTabs {...foyer} {...magasinActions}>
            <RayonsView magasin={foyer.magasinActif} items={foyer.state.items} actions={actions} />
          </MagasinTabs>
        </Tabs.Panel>
        <Tabs.Panel value="items" className={panelClassName}>
          <MagasinTabs {...foyer} {...magasinActions}>
            <ItemsView magasin={foyer.magasinActif} items={foyer.state.items} actions={actions} />
          </MagasinTabs>
        </Tabs.Panel>
        <Tabs.Panel value="reglages" className={panelClassName}>
          <Reglages acces={acces} />
        </Tabs.Panel>
      </Tabs.Root>
      {fiche}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}

/**
 * A new magasin opens on its rayons, its name field focused; a removed one hands the focus to
 * the tab of the magasin shown next.
 */
function useMagasinActions({
  foyer,
  writer,
  announce,
  showRayons,
}: {
  foyer: Foyer;
  writer: Writer;
  announce: (message: string) => void;
  showRayons: () => void;
}) {
  const focus = useFocusRequest<"nom" | "onglet">();
  return {
    focus,
    createMagasin: (name: string) => {
      focus.request("nom");
      foyer.selectMagasin(createMagasin(writer, name));
      showRayons();
      announce(`Magasin ${name} créé.`);
    },
    removeMagasin: ({ id, name }: Magasin) => {
      focus.request("onglet");
      configActions(writer, id).removeMagasin(id);
      announce(`Magasin ${name} supprimé.`);
    },
  };
}

const sections = [
  { value: "rayons", label: "Rayons" },
  { value: "items", label: "Items" },
  { value: "reglages", label: "Réglages" },
];

const headerButtonClassName =
  "flex h-11 items-center gap-1 rounded-md px-3 text-base font-medium text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700";

const sectionTabClassName =
  "h-12 flex-1 border-b-4 border-transparent px-4 text-base font-medium text-neutral-700 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700 data-active:border-neutral-950 data-active:text-neutral-950 md:flex-none md:border-b-0 md:border-l-4 md:text-left";

const panelClassName = "min-w-0 flex-1 outline-none";
