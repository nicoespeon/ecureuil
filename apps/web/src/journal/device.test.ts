import { afterEach, describe, expect, it } from "vitest";
import { lienSecret, thisDevice } from "./device";

afterEach(() => history.replaceState(null, "", "/"));

describe("l'appareil", () => {
  it("retient le secret du lien ouvert et le retire de l'adresse", () => {
    history.replaceState(null, "", "/?magasin=costco#secret-du-lien");

    const opened = lienSecret();
    const afterReload = lienSecret();

    expect(opened).toBe("secret-du-lien");
    expect(afterReload).toBe("secret-du-lien");
    expect(location.href).toBe(`${location.origin}/?magasin=costco`);
  });

  it("n'a pas de secret tant qu'aucun lien n'a été ouvert", () => {
    expect(lienSecret()).toBeNull();
  });

  it("garde le même id d'un chargement à l'autre", () => {
    expect(thisDevice()).toBe(thisDevice());
  });
});
