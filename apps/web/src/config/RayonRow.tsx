import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Rayon } from "@ecureuil/domain";
import { ConfirmButton } from "./ConfirmButton";
import { NameInput } from "./NameInput";

export function RayonRow({
  rayon,
  articleCount,
  actions,
}: {
  rayon: Rayon;
  articleCount: number;
  actions: {
    rename: (name: string) => void;
    /** Undefined where the rayon cannot go further. */
    move: Readonly<Record<Direction, (() => void) | undefined>>;
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
      className={`flex items-center gap-1 border-b-2 border-neutral-100 bg-white py-1 last:border-b-0 ${sortable.isDragging ? "relative z-10 shadow-lg" : ""}`}
    >
      <button
        ref={sortable.setActivatorNodeRef}
        type="button"
        data-rayon-id={rayon.id}
        {...sortable.attributes}
        {...sortable.listeners}
        className="grid size-11 shrink-0 cursor-grab touch-none place-items-center rounded-full text-neutral-700 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 active:cursor-grabbing"
      >
        <GripIcon />
        <span className="sr-only">Déplacer {rayon.name}</span>
      </button>
      <NameInput name={rayon.name} rename={actions.rename} aria-label={`Renommer ${rayon.name}`} />
      <MoveButton rayon={rayon} direction="up" move={actions.move} />
      <MoveButton rayon={rayon} direction="down" move={actions.move} />
      <ConfirmButton
        subject={rayon.name}
        warning={{ announce: actions.announce, message: removalWarning(rayon.name, articleCount) }}
        onConfirm={actions.remove}
      />
    </li>
  );
}

type Direction = "up" | "down";

/**
 * Dragging is not for everyone: a screen reader's double tap is a click, not a key. At the end of
 * the list the button stays focusable, only inert, so the focus never falls to the page.
 */
function MoveButton({
  rayon,
  direction,
  move,
}: {
  rayon: Rayon;
  direction: Direction;
  move: Readonly<Record<Direction, (() => void) | undefined>>;
}) {
  const onMove = move[direction];
  return (
    <button
      type="button"
      aria-disabled={onMove === undefined}
      onClick={onMove}
      className="grid size-11 shrink-0 place-items-center rounded-full text-neutral-900 hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-blue-700 aria-disabled:text-neutral-400 aria-disabled:hover:bg-transparent"
    >
      <svg
        aria-hidden="true"
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={direction === "up" ? "m18 15-6-6-6 6" : "m6 9 6 6 6-6"} />
      </svg>
      <span className="sr-only">
        {direction === "up" ? "Monter" : "Descendre"} {rayon.name}
      </span>
    </button>
  );
}

function removalWarning(name: string, articleCount: number) {
  const question = `Supprimer ${name} ?`;
  if (articleCount === 0) return question;
  if (articleCount === 1) return `${question} 1 article passera en Non classé.`;
  return `${question} ${articleCount} articles passeront en Non classé.`;
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
