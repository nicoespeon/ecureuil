import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp, shownMessages } from "./renderApp";

describe("la fiche d'un article", () => {
  it("s'ouvre en touchant le nom d'un article dans la liste", async () => {
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

  it("s'ouvre depuis la vue Articles de la configuration", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Configuration" }));
    await user.click(screen.getByRole("tab", { name: "Articles" }));

    await user.click(screen.getByRole("button", { name: "Pain" }));

    expect(fiche("Pain").getByRole("checkbox", { name: "À acheter" })).not.toBeChecked();
  });

  it("renommer l'article renomme sa ligne dans la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    const name = fiche("Lait").getByRole("textbox", { name: "Nom" });
    await user.clear(name);
    await user.type(name, "Lait d'avoine{Enter}");
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.getByRole("button", { name: "Lait d'avoine" })).toBeVisible();
  });

  it("décocher « À acheter » retire l'article de la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("checkbox", { name: "À acheter" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.queryByRole("button", { name: "Lait" })).not.toBeInTheDocument();
  });

  it("supprimer Lait depuis sa fiche l'annonce une fois la fiche fermée", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("button", { name: "Supprimer Lait" }));
    await user.click(fiche("Lait").getByRole("button", { name: /Confirmer/ }));

    expect(shownMessages()).toEqual(["Supprimé : Lait"]);
  });

  it("la quantité se règle depuis la fiche", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Babybel" }));

    await user.click(fiche("Babybel").getByRole("button", { name: /Augmenter/ }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.getByRole("group", { name: "Quantité de Babybel" })).toHaveTextContent("2");
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

    expect(section("Épicerie").getByRole("button", { name: "Croissants" })).toBeVisible();
  });

  it("fermer la fiche rend le focus au nom de l'article, même rangé ailleurs", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Croissants" }));

    await user.selectOptions(
      fiche("Croissants").getByRole("combobox", { name: "Rayon chez Costco" }),
      "Épicerie",
    );
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(section("Épicerie").getByRole("button", { name: "Croissants" })).toHaveFocus();
  });

  it("fermer la fiche d'un article retiré de la liste ne perd pas le focus", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("checkbox", { name: "À acheter" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(screen.getByRole("tabpanel", { name: "Costco" })).toHaveFocus();
  });

  it("supprimer l'article, confirmé, le retire du catalogue et ferme la fiche", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Lait" }));

    await user.click(fiche("Lait").getByRole("button", { name: "Supprimer Lait" }));
    await user.click(fiche("Lait").getByRole("button", { name: /Confirmer/ }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Lait" })).not.toBeInTheDocument();
  });
});

function fiche(name: string) {
  return within(screen.getByRole("dialog", { name }));
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
