import type { ReactNode } from "react";

/** The last row of a search with no article of that exact name, in the list's panel as in the configuration. */
export function CreateArticleButton({ name, create }: { name: string; create: () => void }) {
  return (
    <AddButton onClick={create}>
      <span className="min-w-0 flex-1 truncate">Créer « {name} »</span>
    </AddButton>
  );
}

export function AddButton({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${rowLayoutClassName} font-bold hover:bg-neutral-50 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-blue-700`}
    >
      {children}
      <span
        aria-hidden="true"
        className="grid size-9 shrink-0 place-items-center rounded-full bg-roux text-xl leading-none font-black text-white"
      >
        +
      </span>
    </button>
  );
}

export const rowLayoutClassName =
  "flex min-h-14 w-full items-center gap-3 border-b-2 border-neutral-100 px-4 text-left text-base in-[li:last-child]:border-b-0 rounded-[inherit]";
