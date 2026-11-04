import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { PullQuery, PullResponse, PushRequest } from "./journal";

const event = {
  id: "e1",
  at: 1762282800000,
  actor: "invite",
  device: "pixel",
  magasin: null,
  type: "DemandeCreated",
  payload: { demandeId: "d1", name: "Chips" },
};

describe("push", () => {
  const decode = Schema.decodeUnknownSync(PushRequest);

  it("decodes a request carrying journal events", () => {
    const raw = { events: [event] };

    expect(decode(raw)).toEqual(raw);
  });

  it("rejects a request where one event is invalid", () => {
    const invalid = { ...event, type: "Teleported" };

    expect(() => decode({ events: [event, invalid] })).toThrow();
  });
});

describe("pull", () => {
  const decodeQuery = Schema.decodeUnknownSync(PullQuery);
  const decodeResponse = Schema.decodeUnknownSync(PullResponse);

  it("accepts a query without a cursor, to read the journal from the start", () => {
    expect(decodeQuery({})).toEqual({});
  });

  it("decodes a query that resumes after a cursor", () => {
    expect(decodeQuery({ since: "42" })).toEqual({ since: "42" });
  });

  it("rejects an empty cursor in the query", () => {
    expect(() => decodeQuery({ since: "" })).toThrow();
  });

  it("decodes a response with the new events and the next cursor", () => {
    const raw = { events: [event], cursor: "43" };

    expect(decodeResponse(raw)).toEqual(raw);
  });

  it("rejects a response with an empty cursor", () => {
    expect(() => decodeResponse({ events: [], cursor: "" })).toThrow();
  });
});
