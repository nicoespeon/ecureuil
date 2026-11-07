import { Tabs } from "@base-ui/react/tabs";
import type { Magasin } from "@ecureuil/domain";
import { useState } from "react";
import type { AccesStore } from "../acces/acces";
import { Reglages } from "../acces/Reglages";
import { ArticlesView } from "./ArticlesView";
import { configActions, createMagasin, type Writer } from "./configActions";
import { type FicheFoyer, useFicheArticle } from "./FicheArticle";
import { LiveRegion } from "./LiveRegion";
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
  const { openFiche, fiche } = useFicheArticle({
    foyer,
    writer,
    announce,
    focusAfterRemove: titleRef,
  });
  const [section, setSection] = useState("rayons");
  const config = configActions(writer, foyer.magasinActif.id);
  const magasinActions = useMagasinActions({
    foyer,
    writer,
    announce,
    showRayons: () => setSection("rayons"),
    removeMagasin: config.removeMagasin,
  });
  const actions = {
    ...config,
    ...magasinActions,
    announce,
    openFiche,
  };

  return (
    <div className="mx-auto min-h-dvh max-w-5xl">
      <header className="sticky top-0 z-20 flex h-16 items-center gap-2 bg-neutral-100 px-2">
        <button type="button" onClick={onClose} className={headerButtonClassName}>
          <span aria-hidden="true">←</span> Liste
        </button>
        <h1 ref={titleRef} tabIndex={-1} className="text-xl font-black outline-none">
          Configuration
        </h1>
      </header>
      <Tabs.Root
        value={section}
        onValueChange={(value) => typeof value === "string" && setSection(value)}
        orientation={sidebar ? "vertical" : "horizontal"}
        render={<main />}
        className="md:flex"
      >
        <Tabs.List
          aria-label="Section"
          className="clay-well mx-3 flex gap-1 rounded-full bg-neutral-200 p-1 md:mx-0 md:ml-3 md:w-48 md:shrink-0 md:flex-col md:self-start md:rounded-3xl"
        >
          {sections.map(({ value, label }) => (
            <Tabs.Tab key={value} value={value} className={sectionTabClassName}>
              {label}
            </Tabs.Tab>
          ))}
        </Tabs.List>
        <Tabs.Panel value="rayons" className={panelClassName}>
          <MagasinTabs {...foyer} {...magasinActions}>
            <RayonsView
              magasin={foyer.magasinActif}
              articles={foyer.state.articles}
              actions={actions}
            />
          </MagasinTabs>
        </Tabs.Panel>
        <Tabs.Panel value="articles" className={panelClassName}>
          <MagasinTabs {...foyer} {...magasinActions}>
            <ArticlesView
              magasin={foyer.magasinActif}
              articles={foyer.state.articles}
              actions={actions}
            />
          </MagasinTabs>
        </Tabs.Panel>
        <Tabs.Panel value="reglages" className={panelClassName}>
          <Reglages acces={acces} />
        </Tabs.Panel>
      </Tabs.Root>
      {fiche}
      <LiveRegion>{announcement}</LiveRegion>
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
  removeMagasin,
}: {
  foyer: Foyer;
  writer: Writer;
  removeMagasin: (magasinId: string) => void;
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
      removeMagasin(id);
      announce(`Magasin ${name} supprimé.`);
    },
  };
}

const sections = [
  { value: "rayons", label: "Rayons" },
  { value: "articles", label: "Articles" },
  { value: "reglages", label: "Réglages" },
];

const headerButtonClassName =
  "button-secondary gap-1 px-4 text-base focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";

const sectionTabClassName =
  "h-11 flex-1 rounded-full px-4 text-base font-bold text-neutral-700 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 data-active:clay data-active:font-extrabold data-active:text-neutral-950 md:flex-none md:text-left";

const panelClassName = "min-w-0 flex-1 outline-none";
