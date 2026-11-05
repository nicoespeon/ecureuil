import { seed } from "@ecureuil/domain";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { inMemoryJournal } from "../journal/journal";

describe("la fiche d'un item", () => {
  it("s'ouvre en touchant le nom d'un item dans la liste", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Lait" }));

    expect(fiche("Lait").getByRole("textbox", { name: "Nom" })).toHaveValue("Lait");
    expect(fiche("Lait").getByRole("checkbox", { name: "À acheter" })).toBeChecked();
    expect(fiche("Lait").getByText("3")).toBeVisible();
    expect(fiche("Lait").getByRole("combobox", { name: "Rayon chez Costco" })).toHaveDisplayValue(
      "Produits laitiers",
    );
    expect(fiche("Lait").getByRole("combobox", { name: "Rayon chez Maxi" })).toHaveDisplayValue(
      "Produits laitiers",
    );
  });

  it("s'ouvre depuis la vue Items de la configuration", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));
    await user.click(screen.getByRole("tab", { name: "Items" }));

    await user.click(screen.getByRole("button", { name: "Pain" }));

    expect(fiche("Pain").getByRole("checkbox", { name: "À acheter" })).not.toBeChecked();
  });

  it("renommer l'item renomme sa ligne dans la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    const name = fiche("Lait").getByRole("textbox", { name: "Nom" });
    await user.clear(name);
    await user.type(name, "Lait d'avoine{Enter}");
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.getByRole("checkbox", { name: "Lait d'avoine" })).toBeVisible();
  });

  it("décocher « À acheter » retire l'item de la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("checkbox", { name: "À acheter" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByRole("checkbox", { name: "Lait" })).not.toBeInTheDocument();
  });

  it("la quantité se règle depuis la fiche", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Babybel" }));

    await user.click(fiche("Babybel").getByRole("button", { name: /Augmenter/ }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(row("Babybel")).toHaveTextContent("×2");
  });

  it("le rayon chez Maxi se choisit sans quitter Costco", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Croissants" }));

    await user.selectOptions(
      fiche("Croissants").getByRole("combobox", { name: "Rayon chez Maxi" }),
      "Épicerie",
    );
    await user.click(screen.getByRole("button", { name: "Fermer" }));
    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    expect(section("Épicerie").getByRole("checkbox", { name: "Croissants" })).toBeVisible();
  });

  it("supprimer l'item, confirmé, le retire du catalogue et ferme la fiche", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("button", { name: "Supprimer Lait" }));
    await user.click(fiche("Lait").getByRole("button", { name: /Confirmer/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox", { name: "Lait" })).not.toBeInTheDocument();
  });
});

function renderApp() {
  const user = userEvent.setup();
  render(<App journal={inMemoryJournal(seed)} />);
  return { user };
}

function fiche(name: string) {
  return within(screen.getByRole("dialog", { name }));
}

function row(itemName: string) {
  return screen.getByRole("checkbox", { name: itemName }).closest("li");
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
