import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { inMemoryJournal } from "../journal/journal";
import { renderApp } from "./renderApp";

describe("créer un magasin", () => {
  it("le « + » ouvre une fenêtre ; le magasin créé devient actif, avec les rayons par défaut", async () => {
    const { user } = await openConfiguration();

    await createMagasin(user, "IGA");

    expect(screen.getByRole("tab", { name: "IGA" })).toHaveAttribute("aria-selected", "true");
    expect(rayonNames()).toEqual([
      "Fruits et légumes",
      "Boulangerie",
      "Viandes et poissons",
      "Produits laitiers",
      "Épicerie",
      "Surgelés",
      "Hygiène",
      "Entretien",
    ]);
  });

  it("le nom du nouveau magasin prend le focus, et la création est annoncée", async () => {
    const { user } = await openConfiguration();

    await createMagasin(user, "IGA");

    expect(screen.getByRole("textbox", { name: "Nom du magasin" })).toHaveFocus();
    expect(screen.getByText("Magasin IGA créé.")).toHaveRole("status");
  });

  it("depuis la section Articles, la création ramène à la section Rayons", async () => {
    const { user } = await openConfiguration();
    await user.click(screen.getByRole("tab", { name: "Articles" }));

    await createMagasin(user, "IGA");

    expect(screen.getByRole("tab", { name: "Rayons" })).toHaveAttribute("aria-selected", "true");
  });

  it("un nom vide ne crée rien et garde la fenêtre ouverte", async () => {
    const { user } = await openConfiguration();

    await createMagasin(user, "   ");

    expect(screen.getByRole("dialog", { name: "Nouveau magasin" })).toBeVisible();
    await user.click(screen.getByRole("button", { name: "Annuler" }));
    expect(magasinTabNames()).toEqual(["Costco", "Maxi"]);
  });
});

describe("renommer et supprimer un magasin", () => {
  it("renommer le magasin renomme son onglet, dans la liste aussi", async () => {
    const { user } = await openConfiguration();

    const field = screen.getByRole("textbox", { name: "Nom du magasin" });
    await user.clear(field);
    await user.type(field, "Costco Laval{Enter}");
    await user.click(screen.getByRole("button", { name: "Liste" }));

    expect(screen.getByRole("tab", { name: "Costco Laval" })).toBeVisible();
  });

  it("supprimer demande confirmation et dit ce qui sera perdu", async () => {
    const { user } = await openConfiguration();

    await user.click(screen.getByRole("button", { name: "Supprimer Costco" }));

    expect(
      screen.getByText(
        "Supprimer Costco ? Seront perdus : 8 rayons et le classement de 18 articles.",
      ),
    ).toHaveRole("status");
  });

  it("le message de suppression s'accorde au singulier", async () => {
    const { user } = await openConfiguration();
    await createMagasin(user, "IGA");
    const allButOne = [
      "Boulangerie",
      "Viandes et poissons",
      "Produits laitiers",
      "Épicerie",
      "Surgelés",
      "Hygiène",
      "Entretien",
    ];
    for (const rayon of allButOne) await confirmRemoval(user, rayon);

    await user.click(screen.getByRole("button", { name: "Supprimer IGA" }));

    expect(
      screen.getByText("Supprimer IGA ? Seront perdus : 1 rayon et le classement de 0 article."),
    ).toHaveRole("status");
  });

  it("une fois confirmé, l'onglet disparaît et le focus va au magasin restant", async () => {
    const { user } = await openConfiguration();

    await confirmRemoval(user, "Costco");

    expect(magasinTabNames()).toEqual(["Maxi"]);
    expect(screen.getByRole("tab", { name: "Maxi" })).toHaveFocus();
    expect(screen.getByText("Magasin Costco supprimé.")).toHaveRole("status");
  });
});

describe("sans magasin", () => {
  it("après le dernier magasin supprimé, le propriétaire peut en créer un et le configurer", async () => {
    const { user } = await openConfiguration();
    await confirmRemoval(user, "Costco");
    await confirmRemoval(user, "Maxi");

    await user.click(screen.getByRole("button", { name: "Créer un magasin" }));
    await user.type(screen.getByRole("textbox", { name: "Nom" }), "IGA{Enter}");

    expect(screen.getByRole("heading", { level: 1, name: "Configuration" })).toBeVisible();
    expect(screen.getByRole("tab", { name: "IGA" })).toHaveAttribute("aria-selected", "true");
  });

  it("après le dernier magasin supprimé, le focus va au titre de l'écran vide", async () => {
    const { user } = await openConfiguration();
    await confirmRemoval(user, "Costco");

    await confirmRemoval(user, "Maxi");

    expect(screen.getByRole("heading", { level: 1, name: "Écureuil" })).toHaveFocus();
  });

  it("l'invité ne peut pas créer de magasin", () => {
    renderApp({ role: "invite", journal: inMemoryJournal([]) });

    expect(screen.getByText("Cet appareil n'a encore aucun magasin.")).toBeVisible();
    expect(screen.queryByRole("button", { name: "Créer un magasin" })).toBeNull();
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function openConfiguration() {
  const { user } = renderApp();
  await user.click(screen.getByRole("button", { name: "Configuration" }));
  return { user };
}

async function createMagasin(user: User, name: string) {
  await user.click(screen.getByRole("button", { name: "Nouveau magasin" }));
  const dialog = screen.getByRole("dialog", { name: "Nouveau magasin" });
  await user.type(within(dialog).getByRole("textbox", { name: "Nom" }), name);
  await user.click(within(dialog).getByRole("button", { name: "Créer" }));
}

/** Removes a magasin or a rayon: both ask for a second tap. */
async function confirmRemoval(user: User, name: string) {
  await user.click(screen.getByRole("button", { name: `Supprimer ${name}` }));
  await user.click(screen.getByRole("button", { name: `Confirmer la suppression de ${name}` }));
}

function rayonNames() {
  return within(screen.getByRole("list", { name: "Rayons" }))
    .getAllByRole("textbox")
    .map((field) => (field instanceof HTMLInputElement ? field.value : ""));
}

function magasinTabNames() {
  return within(screen.getByRole("tablist", { name: "Magasin" }))
    .getAllByRole("tab")
    .map((tab) => tab.textContent);
}
