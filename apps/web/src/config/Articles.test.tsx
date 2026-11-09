import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp, shownMessages } from "./renderApp";

describe("tous les articles", () => {
  it("liste le catalogue par nom, avec le rayon de chaque article dans le magasin actif", async () => {
    await openArticles();

    expect(rowNames()).toHaveLength(20);
    expect(rowNames().slice(0, 3)).toEqual(["Babybel", "Bananes", "Beurre"]);
    expect(rayonSelect("Lait")).toHaveDisplayValue("Produits laitiers");
    expect(rayonSelect("Croissants")).toHaveDisplayValue("Non classé");
  });

  it("choisir un rayon range l'article dans cette section de la liste", async () => {
    const { user } = await openArticles();

    await user.selectOptions(rayonSelect("Croissants"), "Boulangerie");
    await backToListe(user);

    expect(section("Boulangerie").getByRole("button", { name: "Croissants" })).toBeVisible();
  });

  it("« Pas chez Costco » range l'article dans le groupe replié", async () => {
    const { user } = await openArticles();

    await user.selectOptions(rayonSelect("Croissants"), "Pas chez Costco");
    await backToListe(user);

    expect(screen.getByRole("button", { name: "Pas chez Costco (1)" })).toBeVisible();
  });

  it("classe dans le magasin de l'onglet choisi", async () => {
    const { user } = await openArticles();

    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    expect(rayonSelect("Pyjama polaire Gabriel")).toHaveDisplayValue("Pas chez Maxi");
  });

  it.each([
    ["rape", "Fromage râpé"],
    ["oeufs", "Œufs"],
  ])("la recherche « %s » trouve « %s », sans accents ni casse", async (search, name) => {
    const { user } = await openArticles();

    await user.type(searchbox(), search);

    expect(rowNames()).toEqual([name]);
  });
});

describe("créer un article depuis la configuration", () => {
  it("une recherche sans nom exact propose de créer l'article, en bas des résultats", async () => {
    const { user } = await openArticles();

    await user.type(searchbox(), "lai");

    expect(rows().at(-1)).toContainElement(screen.getByRole("button", { name: "Créer « lai »" }));
  });

  it("un nom exact ne propose pas de créer un doublon", async () => {
    const { user } = await openArticles();

    await user.type(searchbox(), "lait");

    expect(screen.queryByRole("button", { name: /^Créer/ })).toBeNull();
  });

  it("l'article créé entre au catalogue hors liste et non classé, sa fiche ouverte", async () => {
    const { user } = await openArticles();
    await user.type(searchbox(), "Laitue");

    await user.click(screen.getByRole("button", { name: "Créer « Laitue »" }));

    expect(fiche("Laitue").getByRole("checkbox", { name: "À acheter" })).not.toBeChecked();
    expect(fiche("Laitue").getByRole("combobox", { name: "Rayon chez Costco" })).toHaveDisplayValue(
      "Non classé",
    );
  });

  it("la fiche ouverte prend le focus", async () => {
    const { user } = await openArticles();
    await user.type(searchbox(), "Laitue");

    await user.click(screen.getByRole("button", { name: "Créer « Laitue »" }));

    expect(screen.getByRole("dialog", { name: "Laitue" })).toContainElement(
      document.activeElement instanceof HTMLElement ? document.activeElement : null,
    );
  });

  it("annonce l'article créé, même la fiche ouverte", async () => {
    const { user } = await openArticles();
    await user.type(searchbox(), "Laitue");

    await user.click(screen.getByRole("button", { name: "Créer « Laitue »" }));

    expect(shownMessages()).toEqual(["Au catalogue : Laitue"]);
  });

  it("Entrée crée l'article quand aucun nom ne correspond", async () => {
    const { user } = await openArticles();

    await user.type(searchbox(), "Laitue{Enter}");

    expect(screen.getByRole("dialog", { name: "Laitue" })).toBeVisible();
  });

  it("Entrée ouvre la fiche du premier résultat", async () => {
    const { user } = await openArticles();

    await user.type(searchbox(), "pomm{Enter}");

    expect(screen.getByRole("dialog", { name: "Pommes" })).toBeVisible();
  });

  it("fermer la fiche rend le focus à la ligne de l'article créé", async () => {
    const { user } = await openArticles();
    await user.type(searchbox(), "Laitue{Enter}");

    await user.click(fiche("Laitue").getByRole("button", { name: "Fermer" }));

    expect(screen.getByRole("button", { name: "Laitue" })).toHaveFocus();
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function openArticles() {
  const { user } = renderApp();
  await user.click(screen.getByRole("button", { name: "Configuration" }));
  await user.click(screen.getByRole("tab", { name: "Articles" }));
  return { user };
}

async function backToListe(user: User) {
  await user.click(screen.getByRole("button", { name: "Liste" }));
}

function rows() {
  return within(screen.getByRole("list", { name: "Articles" })).getAllByRole("listitem");
}

/** The articles shown, each with its rayon: the « Créer » row has none. */
function rowNames() {
  return rows()
    .filter((row) => within(row).queryByRole("combobox"))
    .map((row) => within(row).getAllByRole("button")[0]?.textContent);
}

function searchbox() {
  return screen.getByRole("searchbox", { name: "Rechercher ou créer un article" });
}

function fiche(name: string) {
  return within(screen.getByRole("dialog", { name }));
}

function rayonSelect(articleName: string) {
  return screen.getByRole("combobox", { name: `Rayon de ${articleName}` });
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
