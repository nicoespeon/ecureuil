import { EventStore } from "@ecureuil/domain";
import { Cursor, Event } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import { inMemoryJournal, type Journal } from "./journal";

const EVENTS = "events";
const META = "meta";
const CURSOR_KEY = "cursor";

const Entry = Schema.Struct({ event: Event, pushed: Schema.Boolean });
const decodeEntries = Schema.decodeUnknownSync(Schema.Array(Entry));
const decodeCursor = Schema.decodeUnknownSync(Schema.UndefinedOr(Cursor));

/**
 * The journal of this device in IndexedDB, seen two ways: a synchronous `Journal` for React,
 * an in-memory copy refreshed on every write, and the `EventStore` the sync loop works on.
 * The `seed` is kept as already pushed: it never reaches the server.
 */
export async function openLocalJournal(
  name: string,
  { seed = [] }: { readonly seed?: ReadonlyArray<Event> } = {},
) {
  const db = await openDatabase(name);
  const cache = inMemoryJournal(await readEvents(db));

  const append = async (appended: ReadonlyArray<Event>) => {
    for (const event of appended) await cache.append(event);
    await writeEvents(db, appended, { pushed: false });
  };

  /**
   * Pulled events are on the server, so pushed; seeded ones must never go there. IndexedDB is
   * shared by the tabs of this device: reload what another tab may have written meanwhile.
   */
  const keepAsPushed = async (kept: ReadonlyArray<Event>, cursor?: Cursor) => {
    await writeEvents(db, kept, { pushed: true, cursor });
    const stored = await readEvents(db);
    const known = new Set(cache.all().map(({ id }) => id));
    for (const event of stored.filter(({ id }) => !known.has(id))) await cache.append(event);
  };

  await keepAsPushed(seed);

  const journal: Journal = { ...cache, append: (event) => append([event]) };
  const store = EventStore.of({
    append: (appended) => Effect.promise(() => append(appended)),
    all: Effect.sync(cache.all),
    unpushed: Effect.promise(() => readUnpushed(db)),
    markPushed: (ids) =>
      Effect.promise(() => {
        const pushed = new Set(ids);
        return writeEvents(
          db,
          cache.all().filter(({ id }) => pushed.has(id)),
          { pushed: true },
        );
      }),
    cursor: Effect.promise(() => readCursor(db)),
    receive: ({ events: pulled, cursor }) => Effect.promise(() => keepAsPushed(pulled, cursor)),
  });

  return { journal, store };
}

/** One transaction, so the cursor never moves without the events it covers. */
function writeEvents(
  db: IDBDatabase,
  events: ReadonlyArray<Event>,
  { pushed, cursor }: { readonly pushed: boolean; readonly cursor?: Cursor | undefined },
) {
  return transaction(db, (tx) => {
    for (const event of events) tx.objectStore(EVENTS).put({ event, pushed });
    if (cursor !== undefined) tx.objectStore(META).put(cursor, CURSOR_KEY);
  });
}

async function readEvents(db: IDBDatabase) {
  return (await readEntries(db)).map(({ event }) => event);
}

async function readUnpushed(db: IDBDatabase) {
  return (await readEntries(db)).filter(({ pushed }) => !pushed).map(({ event }) => event);
}

async function readCursor(db: IDBDatabase) {
  const tx = db.transaction(META);
  return decodeCursor(await request(tx.objectStore(META).get(CURSOR_KEY))) ?? null;
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
