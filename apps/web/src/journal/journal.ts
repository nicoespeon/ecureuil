import type { Event } from "@ecureuil/wire";

/**
 * Where the foyer's events live on this device. In memory for now: the sync task puts
 * IndexedDB behind the same shape.
 */
export type Journal = {
  readonly all: () => ReadonlyArray<Event>;
  readonly append: (event: Event) => void;
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
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
