import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

describe("la navigation vers la configuration", () => {
  it("le bouton Configuration ouvre la configuration, « Liste » ramène à la liste", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));
    expect(screen.getByRole("heading", { level: 1, name: "Configuration" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("checkbox", { name: "Lait" })).toBeVisible();
  });

  it("survoler l'engrenage affiche l'infobulle « Configuration »", async () => {
    const { user } = renderApp();

    await user.hover(screen.getByRole("button", { name: "Configuration" }));

    expect(await screen.findByText("Configuration", {}, { timeout: 2000 })).toBeVisible();
  });

  it("le focus va au titre de la configuration, puis revient au bouton qui l'a ouverte", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));
    expect(screen.getByRole("heading", { level: 1, name: "Configuration" })).toHaveFocus();

    await user.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Configuration" })).toHaveFocus();
  });

  it("offre les sections Rayons, Items et Réglages", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));

    const sections = within(screen.getByRole("tablist", { name: "Section" })).getAllByRole("tab");
    expect(sections.map((tab) => tab.textContent)).toEqual(["Rayons", "Items", "Réglages"]);
  });

  it("sur un écran large, la barre latérale des sections se parcourt avec les flèches haut et bas", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.click(screen.getByRole("tab", { name: "Rayons" }));
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("tab", { name: "Items" })).toHaveFocus();
  });

  it("la section Réglages montre les réglages de l'appareil", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.click(screen.getByRole("tab", { name: "Réglages" }));

    expect(screen.getByRole("heading", { level: 3, name: "Accès" })).toBeVisible();
  });

  it("la configuration écrit au nom du rôle de l'appareil", async () => {
    const { user, journal } = renderApp({ role: "invite" });
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.type(screen.getByRole("textbox", { name: "Nouveau rayon" }), "Pharmacie{Enter}");

    expect(journal.all().at(-1)).toMatchObject({ type: "RayonCreated", actor: "invite" });
  });
});
