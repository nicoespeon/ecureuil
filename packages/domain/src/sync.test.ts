import { type Cursor, Event } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import { describe, expect, it } from "vitest";
import { EventStore, SyncTransport, TransportError } from "./ports";
import { sync } from "./sync";

describe("sync", () => {
  it("pousse les événements de cet appareil et tire ceux des autres", async () => {
    const server = fakeServer();
    const phone = fakeDevice();
    const mac = fakeDevice();
    await phone.write(event("lait"));
    await mac.write(event("pain"));

    await phone.sync(server.connect());
    await mac.sync(server.connect());
    await phone.sync(server.connect());

    expect(await phone.ids()).toEqual(["lait", "pain"]);
    expect(await mac.ids()).toEqual(["pain", "lait"]);
  });

  it("pousse un événement une fois, pas à chaque tour", async () => {
    const server = fakeServer();
    const phone = fakeDevice();
    await phone.write(event("lait"));

    await phone.sync(server.connect());
    await phone.sync(server.connect());

    expect(server.pushes()).toEqual([["lait"]]);
  });

  it("garde pour le tour suivant un geste fait pendant le push", async () => {
    const server = fakeServer();
    const phone = fakeDevice();
    await phone.write(event("lait"));

    await phone.sync(server.connect({ duringPush: () => phone.write(event("pain")) }));
    await phone.sync(server.connect());

    expect(server.pushes()).toEqual([["lait"], ["pain"]]);
  });

  it("tire depuis le curseur du tour précédent", async () => {
    const server = fakeServer();
    const phone = fakeDevice();
    await phone.sync(server.connect());
    const mac = fakeDevice();
    await mac.write(event("pain"));
    await mac.sync(server.connect());

    await phone.sync(server.connect());

    expect(server.pulls()).toEqual([null, null, "0"]);
  });

  it("tire quand même si le serveur refuse le push, et signale le refus", async () => {
    const server = fakeServer();
    const mac = fakeDevice();
    await mac.write(event("pain"));
    await mac.sync(server.connect());
    const phone = fakeDevice();
    await phone.write(event("lait"));

    const refused = await phone.sync(server.connect({ refusePush: true }));

    expect(refused).toMatchObject({ _tag: "Failure", failure: { _tag: "TransportError" } });
    expect(await phone.ids()).toEqual(["lait", "pain"]);
  });

  it("échoue hors ligne et garde les événements pour le retour du réseau", async () => {
    const server = fakeServer();
    const phone = fakeDevice();
    await phone.write(event("lait"));

    const offline = await phone.sync(server.connect({ offline: true }));
    await phone.sync(server.connect());

    expect(offline).toMatchObject({ _tag: "Failure", failure: { _tag: "TransportError" } });
    expect(server.journal()).toEqual(["lait"]);
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
    type: "ArticleCreated",
    payload: { articleId: id, name: id },
  });
}

/** A device with an in-memory EventStore that honours the port's contract. */
function fakeDevice() {
  let entries: ReadonlyArray<{ readonly event: Event; readonly pushed: boolean }> = [];
  let cursor: Cursor | null = null;
  const store = EventStore.of({
    append: (events) =>
      Effect.sync(() => {
        entries = [...entries, ...events.map((event) => ({ event, pushed: false }))];
      }),
    all: Effect.sync(() => entries.map(({ event }) => event)),
    unpushed: Effect.sync(() => entries.filter(({ pushed }) => !pushed).map(({ event }) => event)),
    markPushed: (ids) =>
      Effect.sync(() => {
        entries = entries.map((entry) =>
          ids.includes(entry.event.id) ? { ...entry, pushed: true } : entry,
        );
      }),
    cursor: Effect.sync(() => cursor),
    receive: (pulled) =>
      Effect.sync(() => {
        const known = new Set(entries.map(({ event }) => event.id));
        entries = [
          ...entries,
          ...pulled.events
            .filter(({ id }) => !known.has(id))
            .map((event) => ({ event, pushed: true })),
        ];
        cursor = pulled.cursor;
      }),
  });
  return {
    write: (written: Event) => Effect.runPromise(store.append([written])),
    ids: () => Effect.runPromise(store.all).then((events) => events.map(({ id }) => id)),
    sync: (transport: SyncTransport["Service"]) =>
      Effect.runPromise(
        sync.pipe(
          Effect.provideService(EventStore, store),
          Effect.provideService(SyncTransport, transport),
          Effect.result,
        ),
      ),
  };
}

/** The API in memory: ignores ids it knows, the cursor is how many events it holds. */
function fakeServer() {
  let journal: ReadonlyArray<Event> = [];
  const pushes: Array<ReadonlyArray<string>> = [];
  const pulls: Array<Cursor | null> = [];
  return {
    journal: () => journal.map(({ id }) => id),
    pushes: () => pushes,
    pulls: () => pulls,
    connect: ({ offline = false, refusePush = false, duringPush = async () => {} } = {}) =>
      SyncTransport.of({
        push: (events) =>
          offline || refusePush
            ? Effect.fail(new TransportError({ cause: "offline" }))
            : Effect.promise(async () => {
                pushes.push(events.map(({ id }) => id));
                await duringPush();
                const known = new Set(journal.map(({ id }) => id));
                journal = [...journal, ...events.filter(({ id }) => !known.has(id))];
              }),
        pull: (since) =>
          offline
            ? Effect.fail(new TransportError({ cause: "offline" }))
            : Effect.sync(() => {
                pulls.push(since);
                return {
                  events: journal.slice(Number(since ?? 0)),
                  cursor: String(journal.length),
                };
              }),
      }),
  };
}
