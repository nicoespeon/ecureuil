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
import type { Magasin, State } from "@ecureuil/domain";
import { type FormEvent, useId } from "react";
import { fieldClassName, submitClassName } from "./classNames";
import type { ConfigActions } from "./configActions";
import { RayonRow } from "./RayonRow";
import { screenReaderInstructions, useRayonAnnouncements } from "./rayonAnnouncements";

type Actions = Pick<
  ConfigActions,
  "createRayon" | "renameRayon" | "reorderRayons" | "removeRayon"
> & { readonly announce: (message: string) => void };

export function RayonsView({
  magasin,
  items,
  actions,
}: {
  magasin: Magasin;
  items: State["items"];
  actions: Actions;
}) {
  const { rayons } = magasin;
  const rayonIds = rayons.map((rayon) => rayon.id);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const announcements = useRayonAnnouncements(rayons);

  const onDragEnd = ({ active, over }: DragEndEvent) => {
    const from = rayonIds.indexOf(String(active.id));
    const to = over ? rayonIds.indexOf(String(over.id)) : from;
    if (from !== to) actions.reorderRayons(magasin.id, arrayMove(rayonIds, from, to));
  };

  return (
    <div className="p-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{ announcements, screenReaderInstructions }}
      >
        <SortableContext items={rayonIds} strategy={verticalListSortingStrategy}>
          <ul aria-label="Rayons" className="max-w-xl">
            {rayons.map((rayon) => (
              <RayonRow
                key={rayon.id}
                rayon={rayon}
                itemCount={itemCountIn(items, { magasinId: magasin.id, rayonId: rayon.id })}
                actions={{
                  rename: (name) => actions.renameRayon(magasin.id, { rayonId: rayon.id, name }),
                  remove: () => actions.removeRayon(magasin.id, rayon.id),
                  announce: actions.announce,
                }}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
      <NouveauRayon create={(name) => actions.createRayon(magasin.id, name)} />
    </div>
  );
}

function itemCountIn(
  items: State["items"],
  { magasinId, rayonId }: { magasinId: string; rayonId: string },
) {
  return Object.values(items).filter((item) => {
    const itemRayon = item.rayonParMagasin[magasinId];
    return itemRayon?._tag === "Rayon" && itemRayon.rayonId === rayonId;
  }).length;
}

function NouveauRayon({ create }: { create: (name: string) => void }) {
  const inputId = useId();
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = event.currentTarget;
    const name = new FormData(form).get("name");
    if (typeof name === "string" && name.trim() !== "") create(name.trim());
    form.reset();
  };

  return (
    <form onSubmit={onSubmit} className="mt-4 flex max-w-xl items-end gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-800">
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
