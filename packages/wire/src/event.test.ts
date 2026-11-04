import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { Event } from "./event";

const decode = Schema.decodeUnknownSync(Event);

const envelope = { id: "e1", at: 1762282800000, actor: "owner", store: "costco" };

describe("Event wire schema", () => {
  it("decodes a store-scoped event with its envelope", () => {
    const raw = {
      ...envelope,
      type: "AisleCreated",
      payload: { aisleId: "a1", name: "Boulangerie" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("decodes a household event with no store context", () => {
    const raw = {
      ...envelope,
      store: null,
      actor: "guest",
      type: "RequestCreated",
      payload: { requestId: "r1", name: "Chips" },
    };

    expect(decode(raw)).toEqual(raw);
  });

  it("rejects an unknown event type", () => {
    expect(() => decode({ ...envelope, type: "Teleported", payload: {} })).toThrow();
  });

  it("rejects a store-scoped event without a store", () => {
    expect(() => decode({ ...envelope, store: null, type: "TripFinished", payload: {} })).toThrow();
  });

  it.each([0, -1, 1.5])("rejects quantity %s: must be a positive integer", (quantity) => {
    expect(() =>
      decode({
        ...envelope,
        store: null,
        type: "ItemQuantitySet",
        payload: { itemId: "i1", quantity },
      }),
    ).toThrow();
  });
});
