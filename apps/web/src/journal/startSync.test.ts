import "fake-indexeddb/auto";
import { SyncTransport, TransportError } from "@ecureuil/domain";
import { Event } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import { afterEach, describe, expect, it, vi } from "vitest";
import { openLocalJournal } from "./localJournal";
import { startSync } from "./startSync";

const running: Array<{ stop: () => void }> = [];

afterEach(() => {
  for (const loop of running.splice(0)) loop.stop();
});

describe("la boucle de sync", () => {
  it("tourne au démarrage, au retour du réseau et au retour au premier plan", async () => {
    const server = fakeServer();
    await start(server);
    await expect.poll(server.pulls).toBe(1);

    window.dispatchEvent(new window.Event("online"));
    await expect.poll(server.pulls).toBe(2);

    document.dispatchEvent(new window.Event("visibilitychange"));
    await expect.poll(server.pulls).toBe(3);
  });

  it("tourne à intervalle régulier", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const server = fakeServer();
    await start(server);
    await expect.poll(server.pulls).toBe(1);

    vi.advanceTimersByTime(30_000);

    await expect.poll(server.pulls).toBe(2);
  });

  it("pousse un geste fait hors ligne quand le réseau revient", async () => {
    const server = fakeServer({ offline: true });
    const { journal } = await start(server);
    await journal.append(event("lait"));

    server.goOnline();
    window.dispatchEvent(new window.Event("online"));

    await expect.poll(server.journal).toEqual(["lait"]);
  });

  it("ne lance qu'un tour à la fois, et refait un tour pour ce qui est arrivé pendant", async () => {
    const server = fakeServer({ slow: true });
    const { journal, requestSync } = await start(server);

    await journal.append(event("lait"));
    requestSync();
    requestSync();
    server.answer();

    await expect.poll(server.journal).toEqual(["lait"]);
    expect(server.mostConcurrentRounds()).toBe(1);
  });
});

async function start(server: ReturnType<typeof fakeServer>) {
  const { journal, store } = await openLocalJournal(`ecureuil-test-${crypto.randomUUID()}`);
  const loop = startSync({ store, transport: server.transport });
  running.push(loop);
  return { journal, requestSync: loop.requestSync };
}

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

/**
 * The API in memory. `slow` holds every request until `answer()`; `offline` fails them all
 * until `goOnline()`.
 */
function fakeServer({ offline = false, slow = false } = {}) {
  let journal: ReadonlyArray<Event> = [];
  let pulls = 0;
  let inFlight = 0;
  let mostInFlight = 0;
  let isOffline = offline;
  let answered = !slow;
  const waiting = new Set<() => void>();

  const request = <A>(handle: () => A) =>
    Effect.promise(async () => {
      inFlight += 1;
      mostInFlight = Math.max(mostInFlight, inFlight);
      if (!answered) await new Promise<void>((resolve) => waiting.add(resolve));
      inFlight -= 1;
      return handle();
    }).pipe(
      Effect.flatMap((result) =>
        isOffline ? Effect.fail(new TransportError({ cause: "offline" })) : Effect.succeed(result),
      ),
    );

  return {
    pulls: () => pulls,
    journal: () => journal.map(({ id }) => id),
    mostConcurrentRounds: () => mostInFlight,
    goOnline: () => {
      isOffline = false;
    },
    answer: () => {
      answered = true;
      for (const resolve of waiting) resolve();
    },
    transport: SyncTransport.of({
      push: (events) =>
        request(() => {
          if (isOffline) return;
          const known = new Set(journal.map(({ id }) => id));
          journal = [...journal, ...events.filter(({ id }) => !known.has(id))];
        }),
      pull: (since) =>
        request(() => {
          if (!isOffline) pulls += 1;
          return { events: journal.slice(Number(since ?? 0)), cursor: String(journal.length) };
        }),
    }),
  };
}
