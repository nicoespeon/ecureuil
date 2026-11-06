import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

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

    await user.type(screen.getByRole("searchbox", { name: "Rechercher un article" }), search);

    expect(rowNames()).toEqual([name]);
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

function rowNames() {
  return within(screen.getByRole("list", { name: "Articles" }))
    .getAllByRole("listitem")
    .map((row) => within(row).getAllByRole("button")[0]?.textContent);
}

function rayonSelect(articleName: string) {
  return screen.getByRole("combobox", { name: `Rayon de ${articleName}` });
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
