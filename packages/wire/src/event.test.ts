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

describe("Event wire schema", () => {
  it("decodes a magasin-scoped event with its envelope", () => {
    const raw = {
      ...envelope,
      type: "RayonCreated",
      payload: { rayonId: "a1", name: "Boulangerie" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("decodes a foyer event with no magasin context", () => {
    const raw = {
      ...envelope,
      magasin: null,
      actor: "invite",
      type: "DemandeCreated",
      payload: { demandeId: "r1", name: "Chips" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("rejects an event that does not say which device wrote it", () => {
    const { device: _device, ...withoutDevice } = envelope;

    expect(() => decode({ ...withoutDevice, type: "SortieFinished", payload: {} })).toThrow();
  });

  it("rejects an unknown event type", () => {
    expect(() => decode({ ...envelope, type: "Teleported", payload: {} })).toThrow();
  });

  it("rejects a magasin-scoped event without a magasin", () => {
    expect(() =>
      decode({ ...envelope, magasin: null, type: "SortieFinished", payload: {} }),
    ).toThrow();
  });

  it.each(["id", "device", "magasin"])("rejects an empty %s", (field) => {
    expect(() =>
      decode({ ...envelope, [field]: "", type: "SortieFinished", payload: {} }),
    ).toThrow();
  });

  it("rejects an empty entity id in a payload", () => {
    expect(() =>
      decode({ ...envelope, type: "RayonCreated", payload: { rayonId: "", name: "Fruits" } }),
    ).toThrow();
  });

  it.each([0, -1, 1.5])("rejects quantity %s: must be a positive integer", (quantity) => {
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
