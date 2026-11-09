import { createContext, type ReactNode, use, useCallback, useEffect, useState } from "react";
import { type Icon, MessageIcon } from "./MessageIcon";

const DURATION_MS = 2500;

export type Message = { readonly icon: Icon; readonly text: string };
type Shown = Message & { readonly id: number };

const ShowMessage = createContext<((message: Message) => void) | null>(null);

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
  // Stable: the screens that show messages do not re-render each time one comes and goes.
  const show = useCallback(
    (message: Message) => setShown((previous) => ({ ...message, id: (previous?.id ?? 0) + 1 })),
    [],
  );

  useEffect(() => {
    if (!shown) return;
    const timeout = setTimeout(() => setShown(undefined), DURATION_MS);
    return () => clearTimeout(timeout);
  }, [shown]);

  return (
    <ShowMessage value={show}>
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
            className="message clay pointer-events-auto min-h-14 max-w-md flex items-center gap-3 rounded-[1.75rem] py-2 pr-6 pl-2 text-left text-lg font-extrabold"
          >
            <MessageIcon icon={shown.icon} />
            {shown.text}
          </button>
        )}
      </div>
    </ShowMessage>
  );
}
