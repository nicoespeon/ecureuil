import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import type { Magasin, Rayon, State } from "@ecureuil/domain";
import { type FormEvent, useId, useLayoutEffect, useRef } from "react";
import { ConfirmButton } from "./ConfirmButton";
import { fieldClassName, submitClassName } from "./classNames";
import type { ConfigActions } from "./configActions";
import { NameInput } from "./NameInput";
import { RayonRow } from "./RayonRow";
import { screenReaderInstructions, useRayonAnnouncements } from "./rayonAnnouncements";
import type { FocusRequest } from "./useFocusRequest";

type Actions = Pick<
  ConfigActions,
  "renameMagasin" | "createRayon" | "renameRayon" | "reorderRayons" | "removeRayon"
> & {
  readonly removeMagasin: (magasin: Magasin) => void;
  readonly focus: FocusRequest<"nom" | "onglet">;
  readonly announce: (message: string) => void;
};

export function RayonsView({
  magasin,
  articles,
  actions,
}: {
  magasin: Magasin;
  articles: State["articles"];
  actions: Actions;
}) {
  const { rayons } = magasin;
  const rayonIds = rayons.map((rayon) => rayon.id);
  const sensors = useRayonSensors();
  const announcements = useRayonAnnouncements(rayons);
  const { containerRef, focusNeighborOf } = useFocusNeighborOfRemovedRayon(rayonIds);
  const moveBy = moveRayon({ magasinId: magasin.id, rayonIds, actions });

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = rayonIds.indexOf(String(active.id));
    const to = over ? rayonIds.indexOf(String(over.id)) : from;
    if (from !== to) actions.reorderRayons(magasin.id, arrayMove(rayonIds, from, to));
  };

  return (
    <div ref={containerRef} className="p-4">
      <NomDuMagasin
        key={magasin.id}
        magasin={magasin}
        classifiedArticleCount={classifiedArticleCount(articles, magasin.id)}
        actions={{
          rename: (name) => actions.renameMagasin(magasin.id, name),
          remove: () => actions.removeMagasin(magasin),
          announce: actions.announce,
          takeFocus: () => actions.focus.take("nom"),
        }}
      />
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <SortableContext items={rayonIds} strategy={verticalListSortingStrategy}>
          <ul aria-label="Rayons" className="list-card mx-0! max-w-xl">
            {rayons.map((rayon) => (
              <RayonRow
                key={rayon.id}
                rayon={rayon}
                articleCount={articleCountIn(articles, {
                  magasinId: magasin.id,
                  rayonId: rayon.id,
                })}
                actions={{
                  rename: (name) => actions.renameRayon(magasin.id, { rayonId: rayon.id, name }),
                  move: { up: moveBy(rayon, -1), down: moveBy(rayon, 1) },
                  remove: () => {
                    focusNeighborOf(rayon.id);
                    actions.removeRayon(magasin.id, rayon.id);
                  },
                  announce: actions.announce,
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <NouveauRayon
        create={(name) => actions.createRayon(magasin.id, name)}
        announce={actions.announce}
      />
    </div>
  );
}

/** The mouse or a finger drags, the keyboard moves with the arrows. */
function useRayonSensors() {
  return useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

/** A move one step up or down, or undefined at the end of the list. */
function moveRayon({
  magasinId,
  rayonIds,
  actions,
}: {
  magasinId: string;
  rayonIds: ReadonlyArray<string>;
  actions: Pick<Actions, "reorderRayons" | "announce">;
}) {
  return (rayon: Rayon, offset: -1 | 1) => {
    const from = rayonIds.indexOf(rayon.id);
    const to = from + offset;
    if (to < 0 || to >= rayonIds.length) return undefined;
    return () => {
      actions.reorderRayons(magasinId, arrayMove([...rayonIds], from, to));
      actions.announce(`${rayon.name} en position ${to + 1} sur ${rayonIds.length}.`);
    };
  };
}

/**
 * The removed rayon's button had the focus: it goes to the next rayon's handle, the previous
 * one, or the « Nouveau rayon » field when no rayon is left.
 */
function useFocusNeighborOfRemovedRayon(rayonIds: ReadonlyArray<string>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const neighborId = useRef<string | null | undefined>(undefined);

  useLayoutEffect(() => {
    if (neighborId.current === undefined) return;
    const container = containerRef.current;
    const neighbor =
      neighborId.current === null
        ? container?.querySelector("form input")
        : container?.querySelector(`[data-rayon-id="${CSS.escape(neighborId.current)}"]`);
    neighborId.current = undefined;
    if (neighbor instanceof HTMLElement) neighbor.focus();
  });

  return {
    containerRef,
    focusNeighborOf: (rayonId: string) => {
      const index = rayonIds.indexOf(rayonId);
      neighborId.current = rayonIds[index + 1] ?? rayonIds[index - 1] ?? null;
    },
  };
}

function articleCountIn(
  articles: State["articles"],
  { magasinId, rayonId }: { magasinId: string; rayonId: string },
) {
  return Object.values(articles).filter((article) => {
    const articleRayon = article.rayonParMagasin[magasinId];
    return articleRayon?._tag === "Rayon" && articleRayon.rayonId === rayonId;
  }).length;
}

function NomDuMagasin({
  magasin,
  classifiedArticleCount,
  actions,
}: {
  magasin: Magasin;
  classifiedArticleCount: number;
  actions: {
    rename: (name: string) => void;
    remove: () => void;
    announce: (message: string) => void;
    takeFocus: () => boolean;
  };
}) {
  const inputId = useId();
  return (
    <div className="mb-4 flex max-w-xl items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-extrabold text-neutral-800">
          Nom du magasin
        </label>
        <NameInput
          id={inputId}
          name={magasin.name}
          rename={actions.rename}
          takeFocusOnMount={actions.takeFocus}
        />
      </div>
      <ConfirmButton
        subject={magasin.name}
        withLabel
        warning={{
          announce: actions.announce,
          message: removalWarning(magasin, classifiedArticleCount),
        }}
        onConfirm={actions.remove}
      />
    </div>
  );
}

const plural = new Intl.PluralRules("fr");

function removalWarning(magasin: Magasin, classifiedArticleCount: number) {
  const count = (n: number, noun: string) =>
    plural.select(n) === "one" ? `${n} ${noun}` : `${n} ${noun}s`;
  return `Supprimer ${magasin.name} ? Seront perdus : ${count(magasin.rayons.length, "rayon")} et le classement de ${count(classifiedArticleCount, "article")}.`;
}

function classifiedArticleCount(articles: State["articles"], magasinId: string) {
  return Object.values(articles).filter(
    (article) => article.rayonParMagasin[magasinId]?._tag === "Rayon",
  ).length;
}

function NouveauRayon({
  create,
  announce,
}: {
  create: (name: string) => void;
  announce: (message: string) => void;
}) {
  const inputId = useId();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    if (typeof name === "string" && name.trim() !== "") {
      create(name.trim());
      announce(`Rayon ${name.trim()} ajouté.`);
    }
    form.reset();
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 flex max-w-xl items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-extrabold text-neutral-800">
          Nouveau rayon
        </label>
        <input id={inputId} name="name" autoComplete="off" className={fieldClassName} />
      </div>
      <button type="submit" className={submitClassName}>
        Ajouter
      </button>
    </form>
  );
}
