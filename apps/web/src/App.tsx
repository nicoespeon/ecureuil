import { Tabs } from "@base-ui/react/tabs";
import { Tooltip } from "@base-ui/react/tooltip";
import { pendingDemandes } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { type ReactNode, useRef, useState, useSyncExternalStore } from "react";
import { Accueil } from "./acces/Accueil";
import type { AccesStore } from "./acces/acces";
import { CollerLeLien } from "./acces/CollerLeLien";
import { AjoutRapide } from "./ajout/AjoutRapide";
import { ConfigurationView } from "./config/ConfigurationView";
import { createMagasin, type Writer } from "./config/configActions";
import { useFicheItem } from "./config/FicheItem";
import { NouveauMagasin } from "./config/NouveauMagasin";
import { useAnnouncer } from "./config/useAnnouncer";
import { useFocusOnMount } from "./config/useFocusOnMount";
import { InvitePanel } from "./invite/InvitePanel";
import type { Journal } from "./journal/journal";
import { type FoyerWithListe, useFoyer } from "./journal/useFoyer";
import { AValider } from "./liste/AValider";
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
  const [screen, setScreen] = useState<"liste" | "configuration" | "backFromConfiguration">(
    "liste",
  );
  const writer = { journal, actor: role };
  const { magasinActif, liste } = foyer;

  if (!magasinActif || !liste)
    return (
      <SansMagasin
        acces={acces}
        create={
          role === "proprietaire"
            ? (name) => {
                foyer.selectMagasin(createMagasin(writer, name));
                setScreen("configuration");
              }
            : undefined
        }
      />
    );
  if (screen === "configuration")
    return (
      <ConfigurationView
        foyer={{ ...foyer, magasinActif }}
        writer={writer}
        acces={acces}
        onClose={() => setScreen("backFromConfiguration")}
      />
    );

  return (
    <ListeScreen
      foyer={{ ...foyer, magasinActif, liste }}
      writer={writer}
      configuration={{
        focusOnMount: screen === "backFromConfiguration",
        open: () => setScreen("configuration"),
      }}
    />
  );
}

function ListeScreen({
  foyer,
  writer,
  configuration,
}: {
  foyer: FoyerWithListe;
  writer: Writer;
  configuration: { focusOnMount: boolean; open: () => void };
}) {
  const { magasins, magasinActif } = foyer;

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
        {writer.actor === "proprietaire" && (
          <ConfigurationButton
            focusOnMount={configuration.focusOnMount}
            onClick={configuration.open}
          />
        )}
      </header>
      {writer.actor === "invite" ? (
        <InvitePanel foyer={foyer} />
      ) : (
        <MagasinPanel foyer={foyer} writer={writer} />
      )}
    </Tabs.Root>
  );
}

function MagasinPanel({ foyer, writer }: { foyer: FoyerWithListe; writer: Writer }) {
  const { announcement, announce } = useAnnouncer();
  const panelRef = useRef<HTMLDivElement>(null);
  const { openFiche, fiche } = useFicheItem({ foyer, writer, focusAfterRemove: panelRef });
  const { magasinActif: magasin, liste } = foyer;

  return (
    <>
      <Tabs.Panel ref={panelRef} value={magasin.id} className="outline-none">
        <AValider
          demandes={pendingDemandes(foyer.state)}
          actions={{
            acceptDemande: foyer.acceptDemande,
            refuseDemande: foyer.refuseDemande,
            announce,
          }}
          focusAfterLast={panelRef}
        />
        <ListeView
          liste={liste}
          magasinName={magasin.name}
          actions={{
            check: foyer.check,
            uncheck: foyer.uncheck,
            setQuantity: foyer.setQuantity,
            removeFromList: foyer.removeFromList,
            openFiche,
            announce,
          }}
        />
      </Tabs.Panel>
      <BottomBar>
        <AjoutRapide foyer={foyer} writer={writer} />
        <TerminerLesCourses
          liste={liste}
          finishSortie={foyer.finishSortie}
          focusAfterFinish={panelRef}
        />
      </BottomBar>
      {fiche}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </>
  );
}

/** Within thumb reach. Hidden when it holds nothing: a trigger alone renders, never a dialog. */
function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div
      style={{ viewTransitionName: "bottom-bar" }}
      className="fixed inset-x-0 bottom-0 z-20 mx-auto flex max-w-xl gap-3 border-t border-neutral-300 bg-white p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] empty:hidden"
    >
      {children}
    </div>
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
    // An icon alone is a guess for some: the tooltip names it on hover and keyboard focus.
    <Tooltip.Root>
      <Tooltip.Trigger
        ref={ref}
        type="button"
        aria-label="Configuration"
        onClick={onClick}
        className="ml-auto grid size-11 place-items-center rounded-md text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700"
      >
        <GearIcon />
      </Tooltip.Trigger>
      <Tooltip.Portal>
        <Tooltip.Positioner sideOffset={4} className="z-30">
          <Tooltip.Popup className="rounded-md bg-neutral-900 px-2 py-1 text-sm text-white">
            Configuration
          </Tooltip.Popup>
        </Tooltip.Positioner>
      </Tooltip.Portal>
    </Tooltip.Root>
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
function SansMagasin({
  acces,
  create,
}: {
  acces: AccesStore;
  /** Only the proprietaire configures the foyer. */
  create: ((name: string) => void) | undefined;
}) {
  const state = useSyncExternalStore(acces.subscribe, acces.get);

  return (
    <Accueil title="Écureuil">
      <p className="text-lg">Cet appareil n'a encore aucun magasin.</p>
      <p className="text-lg text-neutral-700">
        Ouvrez votre lien d'accès sur cet appareil, ou collez-le ici : votre liste arrive avec la
        synchronisation.
      </p>
      {state._tag === "SansLien" && <CollerLeLien openLien={acces.openLien} />}
      {create && (
        <NouveauMagasin
          create={create}
          trigger={{ className: creerClassName, label: "Créer un magasin" }}
        />
      )}
    </Accueil>
  );
}

const creerClassName =
  "h-12 self-start rounded-md border border-neutral-400 px-4 text-base font-semibold text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700";
