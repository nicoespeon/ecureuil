import { EventStore } from "@ecureuil/domain";
import { Cursor, Event } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import type { Journal } from "./journal";

const EVENTS = "events";
const META = "meta";
const CURSOR_KEY = "cursor";

const Entry = Schema.Struct({ event: Event, pushed: Schema.Boolean });
const decodeEntries = Schema.decodeUnknownSync(Schema.Array(Entry));
const decodeCursor = Schema.decodeUnknownSync(Schema.UndefinedOr(Cursor));

/**
 * The journal of this device in IndexedDB, seen two ways: a synchronous `Journal` for React,
 * kept in memory and refreshed on every write, and the `EventStore` the sync loop works on.
 * The `seed` is kept as already pushed: it never reaches the server.
 */
export async function openLocalJournal(
  name: string,
  { seed = [] }: { readonly seed?: ReadonlyArray<Event> } = {},
) {
  const db = await openDatabase(name);
  let events = (await readEntries(db)).map(({ event }) => event);
  const listeners = new Set<() => void>();

  const append = async (appended: ReadonlyArray<Event>) => {
    events = [...events, ...appended];
    notify();
    await transaction(db, (tx) => {
      for (const event of appended) tx.objectStore(EVENTS).put({ event, pushed: false });
    });
  };

  /** Pulled or seeded events are already on the server, or must never go there. */
  const keepAsPushed = async (kept: ReadonlyArray<Event>, cursor?: Cursor) => {
    const known = new Set(events.map(({ id }) => id));
    const unknown = kept.filter(({ id }) => !known.has(id));
    await transaction(db, (tx) => {
      for (const event of unknown) tx.objectStore(EVENTS).put({ event, pushed: true });
      if (cursor !== undefined) tx.objectStore(META).put(cursor, CURSOR_KEY);
    });
    if (unknown.length === 0) return;
    events = [...events, ...unknown];
    notify();
  };

  function notify() {
    for (const listener of listeners) listener();
  }

  await keepAsPushed(seed);

  const journal: Journal = {
    all: () => events,
    append: (event) => append([event]),
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };

  const store = EventStore.of({
    append: (appended) => Effect.promise(() => append(appended)),
    all: Effect.sync(() => events),
    unpushed: Effect.promise(async () =>
      (await readEntries(db)).filter(({ pushed }) => !pushed).map(({ event }) => event),
    ),
    markPushed: (ids) =>
      Effect.promise(() => {
        const pushed = new Set(ids);
        return transaction(db, (tx) => {
          for (const event of events.filter(({ id }) => pushed.has(id)))
            tx.objectStore(EVENTS).put({ event, pushed: true });
        });
      }),
    cursor: Effect.promise(async () => {
      const tx = db.transaction(META);
      return decodeCursor(await request(tx.objectStore(META).get(CURSOR_KEY))) ?? null;
    }),
    receive: ({ events: pulled, cursor }) => Effect.promise(() => keepAsPushed(pulled, cursor)),
  });

  return { journal, store };
}

function openDatabase(name: string) {
  const opening = indexedDB.open(name, 1);
  opening.onupgradeneeded = () => {
    opening.result.createObjectStore(EVENTS, { keyPath: "event.id" });
    opening.result.createObjectStore(META);
  };
  return request(opening);
}

async function readEntries(db: IDBDatabase) {
  const tx = db.transaction(EVENTS);
  return decodeEntries(await request(tx.objectStore(EVENTS).getAll()));
}

function transaction(db: IDBDatabase, run: (tx: IDBTransaction) => void) {
  const tx = db.transaction([EVENTS, META], "readwrite");
  run(tx);
  return new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function request<T>(pending: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    pending.onsuccess = () => resolve(pending.result);
    pending.onerror = () => reject(pending.error);
  });
}
