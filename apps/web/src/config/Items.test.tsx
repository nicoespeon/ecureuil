import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

describe("tous les items", () => {
  it("liste le catalogue par nom, avec le rayon de chaque item dans le magasin actif", async () => {
    await openItems();

    expect(rowNames()).toHaveLength(20);
    expect(rowNames().slice(0, 3)).toEqual(["Babybel", "Bananes", "Beurre"]);
    expect(rayonSelect("Lait")).toHaveDisplayValue("Produits laitiers");
    expect(rayonSelect("Croissants")).toHaveDisplayValue("Non classé");
  });

  it("choisir un rayon range l'item dans cette section de la liste", async () => {
    const { user } = await openItems();

    await user.selectOptions(rayonSelect("Croissants"), "Boulangerie");
    await backToListe(user);

    expect(section("Boulangerie").getByRole("button", { name: "Croissants" })).toBeVisible();
  });

  it("« Pas chez Costco » range l'item dans le groupe replié", async () => {
    const { user } = await openItems();

    await user.selectOptions(rayonSelect("Croissants"), "Pas chez Costco");
    await backToListe(user);

    expect(screen.getByRole("button", { name: "Pas chez Costco (1)" })).toBeVisible();
  });

  it("classe dans le magasin de l'onglet choisi", async () => {
    const { user } = await openItems();

    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    expect(rayonSelect("Pyjama polaire Gabriel")).toHaveDisplayValue("Pas chez Maxi");
  });

  it.each([
    ["rape", "Fromage râpé"],
    ["oeufs", "Œufs"],
  ])("la recherche « %s » trouve « %s », sans accents ni casse", async (search, name) => {
    const { user } = await openItems();

    await user.type(screen.getByRole("searchbox", { name: "Rechercher un item" }), search);

    expect(rowNames()).toEqual([name]);
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function openItems() {
  const { user } = renderApp();
  await user.click(screen.getByRole("button", { name: "Configuration" }));
  await user.click(screen.getByRole("tab", { name: "Items" }));
  return { user };
}

async function backToListe(user: User) {
  await user.click(screen.getByRole("button", { name: "Liste" }));
}

function rowNames() {
  return within(screen.getByRole("list", { name: "Items" }))
    .getAllByRole("listitem")
    .map((row) => within(row).getAllByRole("button")[0]?.textContent);
}

function rayonSelect(itemName: string) {
  return screen.getByRole("combobox", { name: `Rayon de ${itemName}` });
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
