import { afterEach, describe, expect, it } from "vitest";
import {
  deviceName,
  lienSecret,
  rememberDeviceName,
  rememberLienSecret,
  rememberRole,
  storedRole,
  thisDevice,
} from "./device";

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

  it("retient son nom", () => {
    rememberDeviceName("Téléphone de Nicolas");

    expect(deviceName()).toBe("Téléphone de Nicolas");
  });
});

describe("le rôle retenu", () => {
  it("reste quand le même lien est rouvert", () => {
    rememberLienSecret("secret-du-lien");
    rememberRole("invite");
    history.replaceState(null, "", "/#secret-du-lien");

    lienSecret();

    expect(storedRole()).toBe("invite");
  });

  it("s'oublie quand un autre lien est ouvert", () => {
    rememberLienSecret("secret-du-lien");
    rememberRole("proprietaire");
    history.replaceState(null, "", "/#un-autre-lien");

    lienSecret();

    expect(storedRole()).toBeNull();
  });

  it("s'oublie quand un autre lien est collé", () => {
    rememberLienSecret("secret-du-lien");
    rememberRole("proprietaire");

    rememberLienSecret("un-autre-lien");

    expect([lienSecret(), storedRole()]).toEqual(["un-autre-lien", null]);
  });

  it("ignore une valeur qui n'est pas un rôle", () => {
    localStorage.setItem("ecureuil.role", "admin");

    expect(storedRole()).toBeNull();
  });
});
