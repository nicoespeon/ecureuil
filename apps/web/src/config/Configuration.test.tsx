import { screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

/** happy-dom keeps one history for the whole file: each test marks the entry it starts from. */
const ENTREE_DE_LA_LISTE = "l'entrée de la liste";

describe("la navigation vers la configuration", () => {
  it("le bouton Configuration ouvre la configuration, « Liste » ramène à la liste", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));
    expect(screen.getByRole("heading", { level: 1, name: "Configuration" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("button", { name: "Lait" })).toBeVisible();
  });

  it("ouvrir la configuration ajoute une entrée à l'historique, sans changer l'adresse", async () => {
    const { user } = renderApp();
    history.replaceState(ENTREE_DE_LA_LISTE, "");
    const address = location.href;

    await user.click(screen.getByRole("button", { name: "Configuration" }));

    expect(history.state).not.toBe(ENTREE_DE_LA_LISTE);
    expect(location.href).toBe(address);
  });

  it("le retour du navigateur ramène de la configuration à la liste, le focus sur l'engrenage", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    history.back();

    await waitFor(() =>
      expect(screen.getByRole("button", { name: "Configuration" })).toHaveFocus(),
    );
  });

  it("fermer par « Liste » retire aussi l'entrée de l'historique", async () => {
    const { user } = renderApp();
    history.replaceState(ENTREE_DE_LA_LISTE, "");
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.click(screen.getByRole("button", { name: "Liste" }));

    await waitFor(() => expect(history.state).toBe(ENTREE_DE_LA_LISTE));
    expect(screen.getByRole("button", { name: "Configuration" })).toHaveFocus();
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

  it("offre les sections Rayons, Articles et Réglages", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));

    const sections = within(screen.getByRole("tablist", { name: "Section" })).getAllByRole("tab");
    expect(sections.map((tab) => tab.textContent)).toEqual(["Rayons", "Articles", "Réglages"]);
  });

  it("sur un écran large, la barre latérale des sections se parcourt avec les flèches haut et bas", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.click(screen.getByRole("tab", { name: "Rayons" }));
    await user.keyboard("{ArrowDown}");

    expect(screen.getByRole("tab", { name: "Articles" })).toHaveFocus();
  });

  it("la section Réglages montre les réglages de l'appareil", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));

    await user.click(screen.getByRole("tab", { name: "Réglages" }));

    expect(screen.getByRole("heading", { level: 3, name: "Accès" })).toBeVisible();
  });
});
