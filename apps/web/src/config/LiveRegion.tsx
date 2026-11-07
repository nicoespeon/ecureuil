/**
 * Where `useAnnouncer` speaks. `aria-live` keeps it audible under an open dialog: Base UI hides
 * the rest of the page from screen readers, `[aria-live]` regions aside.
 */
export function LiveRegion({ children }: { children: string }) {
  return (
    <p role="status" aria-live="polite" className="sr-only">
      {children}
    </p>
  );
}
