import "fake-indexeddb/auto";
import { EventStore, SyncTransport, sync } from "@ecureuil/domain";
import { type Cursor, Event } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import { openLocalJournal } from "./localJournal";

describe("le journal local", () => {
  it("un geste sur le téléphone apparaît sur le Mac après une sync de chaque côté", async () => {
    const server = fakeServer();
    const phone = await openLocalJournal(newDatabase());
    const mac = await openLocalJournal(newDatabase());
    await phone.journal.append(event("lait"));

    await syncWith(phone, server);
    await syncWith(mac, server);

    expect(ids(mac)).toEqual(["lait"]);
  });

  it("prévient React quand un tirage apporte des événements", async () => {
    const server = fakeServer();
    const phone = await openLocalJournal(newDatabase());
    await phone.journal.append(event("lait"));
    await syncWith(phone, server);
    const mac = await openLocalJournal(newDatabase());
    const listener = vi.fn();
    mac.journal.subscribe(listener);

    await syncWith(mac, server);

    expect(listener).toHaveBeenCalledOnce();
  });

  it("garde après rechargement ce qui n'est pas encore poussé, et le pousse au tour suivant", async () => {
    const server = fakeServer();
    const database = newDatabase();
    const beforeReload = await openLocalJournal(database);
    await beforeReload.journal.append(event("lait"));

    const afterReload = await openLocalJournal(database);
    await syncWith(afterReload, server);

    expect(ids(afterReload)).toEqual(["lait"]);
    expect(server.pushes()).toEqual([["lait"]]);
  });

  it("ne repousse pas après rechargement ce qui est déjà parti, et tire depuis le curseur", async () => {
    const server = fakeServer();
    const database = newDatabase();
    const beforeReload = await openLocalJournal(database);
    await beforeReload.journal.append(event("lait"));
    await syncWith(beforeReload, server);

    await syncWith(await openLocalJournal(database), server);

    expect(server.pushes()).toEqual([["lait"]]);
    expect(server.pulls()).toEqual([null, "1"]);
  });

  it("montre dans un onglet ce qu'un autre onglet du même appareil a tiré", async () => {
    const server = fakeServer();
    const mac = await openLocalJournal(newDatabase());
    await mac.journal.append(event("pain"));
    await syncWith(mac, server);
    const database = newDatabase();
    const firstTab = await openLocalJournal(database);
    const secondTab = await openLocalJournal(database);

    await syncWith(secondTab, server);
    await syncWith(firstTab, server);

    expect(ids(firstTab)).toEqual(["pain"]);
  });

  it("charge le seed comme déjà poussé : il ne part jamais au serveur", async () => {
    const server = fakeServer();
    const phone = await openLocalJournal(newDatabase(), { seed: [event("lait")] });

    await syncWith(phone, server);

    expect(ids(phone)).toEqual(["lait"]);
    expect(server.pushes()).toEqual([]);
  });
});

const decodeEvent = Schema.decodeUnknownSync(Event);

function event(id: string) {
  return decodeEvent({
    id,
    at: 1,
    actor: "proprietaire",
    device: "pixel",
    magasin: null,
    type: "ItemCreated",
    payload: { itemId: id, name: id },
  });
}

function newDatabase() {
  return `ecureuil-test-${crypto.randomUUID()}`;
}

type LocalJournal = Awaited<ReturnType<typeof openLocalJournal>>;

function ids({ journal }: LocalJournal) {
  return journal.all().map(({ id }) => id);
}

function syncWith({ store }: LocalJournal, server: ReturnType<typeof fakeServer>) {
  return Effect.runPromise(
    sync.pipe(
      Effect.provideService(EventStore, store),
      Effect.provideService(SyncTransport, server.transport),
    ),
  );
}

/** The API in memory: ignores ids it knows, the cursor is how many events it holds. */
function fakeServer() {
  let journal: ReadonlyArray<Event> = [];
  const pushes: Array<ReadonlyArray<string>> = [];
  const pulls: Array<Cursor | null> = [];
  return {
    pushes: () => pushes,
    pulls: () => pulls,
    transport: SyncTransport.of({
      push: (events) =>
        Effect.sync(() => {
          pushes.push(events.map(({ id }) => id));
          const known = new Set(journal.map(({ id }) => id));
          journal = [...journal, ...events.filter(({ id }) => !known.has(id))];
        }),
      pull: (since) =>
        Effect.sync(() => {
          pulls.push(since);
          return { events: journal.slice(Number(since ?? 0)), cursor: String(journal.length) };
        }),
    }),
  };
}
