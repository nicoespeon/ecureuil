import { Event, journalPath, PushRequest } from "@ecureuil/wire";
import { Effect, Schema } from "effect";
import { describe, expect, it, vi } from "vitest";
import { httpTransport } from "./httpTransport";

const API_URL = "https://api.ecureuil.test";
const SECRET = "secret-du-proprietaire";

describe("le transport HTTP", () => {
  it("pousse puis tire à travers le contrat de l'API, depuis le curseur", async () => {
    vi.stubGlobal("fetch", fakeApi());
    const transport = httpTransport({ apiUrl: API_URL, secret: SECRET });

    await Effect.runPromise(transport.push([event("lait")]));
    const fromStart = await Effect.runPromise(transport.pull(null));
    const fromCursor = await Effect.runPromise(transport.pull(fromStart.cursor));

    expect(fromStart).toEqual({ events: [event("lait")], cursor: "1" });
    expect(fromCursor).toEqual({ events: [], cursor: "1" });
  });

  it.each([
    ["un secret refusé", fakeApi({ secret: "un-autre-secret" })],
    ["le réseau coupé", () => Promise.reject(new TypeError("Failed to fetch"))],
    ["une réponse hors contrat", () => Promise.resolve(Response.json({ events: "?" }))],
  ])("échoue en TransportError avec %s", async (_, fetch) => {
    vi.stubGlobal("fetch", fetch);
    const transport = httpTransport({ apiUrl: API_URL, secret: SECRET });

    const pulled = await Effect.runPromise(Effect.result(transport.pull(null)));

    expect(pulled).toMatchObject({ _tag: "Failure", failure: { _tag: "TransportError" } });
  });
});

const decodeEvent = Schema.decodeUnknownSync(Event);
const decodePush = Schema.decodeUnknownSync(Schema.fromJsonString(PushRequest));

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

/** The API as `@ecureuil/wire` describes it, in memory; the cursor counts the events. */
function fakeApi({ secret = SECRET } = {}) {
  let journal: ReadonlyArray<Event> = [];
  return async (input: string, init: RequestInit = {}) => {
    const request = new Request(input, init);
    const url = new URL(request.url);
    if (url.origin !== API_URL || url.pathname !== journalPath)
      return new Response(null, { status: 404 });
    if (request.headers.get("Authorization") !== `Bearer ${secret}`)
      return new Response(null, { status: 401 });
    if (request.method === "POST") {
      journal = [...journal, ...decodePush(await request.text()).events];
      return new Response(null, { status: 204 });
    }
    const since = Number(url.searchParams.get("since") ?? 0);
    return Response.json({ events: journal.slice(since), cursor: String(journal.length) });
  };
}
