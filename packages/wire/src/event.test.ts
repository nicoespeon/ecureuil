import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Event } from "./event";

const decode = Schema.decodeUnknownSync(Event);

const envelope = {
  id: "e1",
  at: 1762282800000,
  actor: "proprietaire",
  device: "pixel",
  magasin: "costco",
};

describe("le schéma wire Event", () => {
  it("décode un événement de magasin avec son enveloppe", () => {
    const raw = {
      ...envelope,
      type: "RayonCreated",
      payload: { rayonId: "a1", name: "Boulangerie" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("décode un événement de foyer sans magasin", () => {
    const raw = {
      ...envelope,
      magasin: null,
      actor: "invite",
      type: "DemandeCreated",
      payload: { demandeId: "r1", name: "Chips" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("rejette un événement qui ne dit pas quel device l'a écrit", () => {
    const { device: _device, ...withoutDevice } = envelope;

    expect(() => decode({ ...withoutDevice, type: "SortieFinished", payload: {} })).toThrow();
  });

  it("rejette un type d'événement inconnu", () => {
    expect(() => decode({ ...envelope, type: "Teleported", payload: {} })).toThrow();
  });

  it("rejette un événement de magasin sans magasin", () => {
    expect(() =>
      decode({ ...envelope, magasin: null, type: "SortieFinished", payload: {} }),
    ).toThrow();
  });

  it.each(["id", "device", "magasin"])("rejette un %s vide", (field) => {
    expect(() =>
      decode({ ...envelope, [field]: "", type: "SortieFinished", payload: {} }),
    ).toThrow();
  });

  it("rejette un id d'entité vide dans un payload", () => {
    expect(() =>
      decode({ ...envelope, type: "RayonCreated", payload: { rayonId: "", name: "Fruits" } }),
    ).toThrow();
  });

  it.each([0, -1, 1.5])("rejette la quantité %s : il faut un entier positif", (quantity) => {
    expect(() =>
      decode({
        ...envelope,
        magasin: null,
        type: "ItemQuantitySet",
        payload: { itemId: "i1", quantity },
      }),
    ).toThrow();
  });
});
