import type { Event } from "@ecureuil/wire";

/**
 * Where the foyer's events live on this device, as React reads them: IndexedDB in the app
 * (`openLocalJournal`), in memory in tests.
 */
export type Journal = {
  readonly all: () => ReadonlyArray<Event>;
  readonly append: (event: Event) => Promise<void>;
  readonly subscribe: (listener: () => void) => () => void;
};

export function inMemoryJournal(initial: ReadonlyArray<Event>): Journal {
  let events = initial;
  const listeners = new Set<() => void>();
  return {
    all: () => events,
    append: (event) => {
      events = [...events, event];
      for (const listener of listeners) listener();
      return Promise.resolve();
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
