import { createContext, type ReactNode, use, useEffect, useState } from "react";

const DURATION_MS = 2500;

type Shown = { readonly id: number; readonly text: string };

const ShowMessage = createContext<((text: string) => void) | null>(null);

/** Shows what a gesture changed in the foyer. Its text is what screen readers say. */
export function useMessage() {
  const show = use(ShowMessage);
  if (!show) throw new Error("useMessage needs a MessageProvider above it");
  return show;
}

/**
 * One message at a time, over every screen and panel: the next replaces it and lands again, even
 * with the same words. A tap closes it, otherwise it leaves on its own.
 */
export function MessageProvider({ children }: { children: ReactNode }) {
  const [shown, setShown] = useState<Shown>();

  useEffect(() => {
    if (!shown) return;
    const timeout = setTimeout(() => setShown(undefined), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [shown]);

  return (
    <ShowMessage value={(text) => setShown((previous) => ({ id: (previous?.id ?? 0) + 1, text }))}>
      {children}
      {/* `aria-live`, like `LiveRegion`: still heard while a dialog hides the rest of the page. */}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-[calc(5.75rem+env(safe-area-inset-bottom))] z-50 flex justify-center px-4"
      >
        {shown && (
          // Out of the tab order: it leaves in seconds, and would take the focus with it.
          <button
            key={shown.id}
            type="button"
            tabIndex={-1}
            onClick={() => setShown(undefined)}
            className="message clay pointer-events-auto min-h-14 max-w-md rounded-full px-6 py-3 text-left text-lg font-extrabold"
          >
            {shown.text}
          </button>
        )}
      </div>
    </ShowMessage>
  );
}
