import { describe, expect, it } from "vitest";
import { tintForMagasin } from "./magasinTint";

describe("la teinte d'un magasin", () => {
  it("cent magasins se répartissent sur les sept teintes", () => {
    const ids = Array.from({ length: 100 }, (_, index) => `magasin-${index}`);

    expect(new Set(ids.map(tintForMagasin))).toEqual(
      new Set(["amber", "orange", "sky", "indigo", "violet", "fuchsia", "cyan"]),
    );
  });

  it("reste la même pour le même magasin", () => {
    expect(tintForMagasin("7d3f0c2a-1b4e-4c8d-9f60-2a5b3c4d5e6f")).toBe(
      tintForMagasin("7d3f0c2a-1b4e-4c8d-9f60-2a5b3c4d5e6f"),
    );
  });
});
