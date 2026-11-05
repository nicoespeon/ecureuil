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

  it("décode une requête qui porte des événements du journal", () => {
    const raw = { events: [event] };

    expect(decode(raw)).toEqual(raw);
  });

  it("rejette une requête dont un événement est invalide", () => {
    const invalid = { ...event, type: "Teleported" };

    expect(() => decode({ events: [event, invalid] })).toThrow();
  });
});

describe("pull", () => {
  const decodeQuery = Schema.decodeUnknownSync(PullQuery);
  const decodeResponse = Schema.decodeUnknownSync(PullResponse);

  it("accepte une query sans cursor, pour lire le journal depuis le début", () => {
    expect(decodeQuery({})).toEqual({});
  });

  it("décode une query qui reprend après un cursor", () => {
    expect(decodeQuery({ since: "42" })).toEqual({ since: "42" });
  });

  it("rejette un cursor vide dans la query", () => {
    expect(() => decodeQuery({ since: "" })).toThrow();
  });

  it("décode une réponse avec les nouveaux événements et le cursor suivant", () => {
    const raw = { events: [event], cursor: "43" };

    expect(decodeResponse(raw)).toEqual(raw);
  });

  it("rejette une réponse au cursor vide", () => {
    expect(() => decodeResponse({ events: [], cursor: "" })).toThrow();
  });
});
