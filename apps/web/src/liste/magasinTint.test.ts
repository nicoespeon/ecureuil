import { describe, expect, it } from "vitest";
import { tintForTab } from "./magasinTint";

describe("la teinte d'un magasin", () => {
  it("les cinq premiers onglets ont chacun leur teinte, dans l'ordre", () => {
    expect([0, 1, 2, 3, 4].map(tintForTab)).toEqual(["indigo", "amber", "cyan", "fuchsia", "lime"]);
  });

  it("le sixième onglet reprend la teinte du premier", () => {
    expect(tintForTab(5)).toBe("indigo");
  });
});
