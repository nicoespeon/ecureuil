import { seed } from "@ecureuil/domain";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { inMemoryJournal } from "../journal/journal";

describe("la navigation vers la configuration", () => {
  it("le bouton Configuration ouvre la configuration, « Liste » ramène à la liste", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Configuration" }));
    expect(screen.getByRole("heading", { level: 1, name: "Configuration" })).toBeVisible();

    await user.click(screen.getByRole("button", { name: "Liste" }));
    expect(screen.getByRole("checkbox", { name: "Lait" })).toBeVisible();
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
});

function renderApp() {
  const user = userEvent.setup();
  render(<App journal={inMemoryJournal(seed)} />);
  return { user };
}
