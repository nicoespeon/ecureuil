import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Rayon } from "@ecureuil/domain";
import type { FocusEvent, KeyboardEvent } from "react";
import { ConfirmButton } from "./ConfirmButton";
import { fieldClassName } from "./classNames";

export function RayonRow({
  rayon,
  itemCount,
  actions,
}: {
  rayon: Rayon;
  itemCount: number;
  actions: {
    rename: (name: string) => void;
    remove: () => void;
    announce: (message: string) => void;
  };
}) {
  const sortable = useSortable({
    id: rayon.id,
    attributes: { roleDescription: "rayon déplaçable" },
  });

  return (
    <li
      ref={sortable.setNodeRef}
      style={{
        transform: CSS.Transform.toString(sortable.transform),
        transition: sortable.transition,
      }}
      className={`flex items-center gap-1 border-b border-neutral-200 bg-white py-1 ${sortable.isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        ref={sortable.setActivatorNodeRef}
        type="button"
        {...sortable.attributes}
        {...sortable.listeners}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-md text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing"
      >
        <GripIcon />
        <span className="sr-only">Déplacer {rayon.name}</span>
      </button>
      <input
        // A new name from another device replaces whatever was typed here.
        key={rayon.name}
        defaultValue={rayon.name}
        aria-label={`Renommer ${rayon.name}`}
        autoComplete="off"
        onBlur={(event) => commitName(event, { rayon, rename: actions.rename })}
        onKeyDown={blurOnEnter}
        className={fieldClassName}
      />
      <ConfirmButton
        subject={rayon.name}
        warning={{ announce: actions.announce, message: removalWarning(rayon.name, itemCount) }}
        onConfirm={actions.remove}
      />
    </li>
  );
}

function commitName(
  event: FocusEvent<HTMLInputElement>,
  { rayon, rename }: { rayon: Rayon; rename: (name: string) => void },
) {
  const name = event.currentTarget.value.trim();
  if (name === "") event.currentTarget.value = rayon.name;
  else if (name !== rayon.name) rename(name);
}

function blurOnEnter(event: KeyboardEvent<HTMLInputElement>) {
  if (event.key === "Enter") event.currentTarget.blur();
}

function removalWarning(name: string, itemCount: number) {
  const question = `Supprimer ${name} ?`;
  if (itemCount === 0) return question;
  if (itemCount === 1) return `${question} 1 item passera en Non classé.`;
  return `${question} ${itemCount} items passeront en Non classé.`;
}

function GripIcon() {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
      <circle cx="9" cy="5" r="1.75" />
      <circle cx="15" cy="5" r="1.75" />
      <circle cx="9" cy="12" r="1.75" />
      <circle cx="15" cy="12" r="1.75" />
      <circle cx="9" cy="19" r="1.75" />
      <circle cx="15" cy="19" r="1.75" />
    </svg>
  );
}
