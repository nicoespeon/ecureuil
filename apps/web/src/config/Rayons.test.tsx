import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp, shownMessages } from "./renderApp";

describe("les rayons d'un magasin", () => {
  it("s'affichent dans l'ordre du magasin actif", async () => {
    await openRayons();

    expect(rayonNames()).toEqual([
      "Vêtements",
      "Hygiène",
      "Épicerie",
      "Collations",
      "Boulangerie",
      "Fruits et légumes",
      "Produits laitiers",
      "Surgelés",
    ]);
  });

  it("suivent l'onglet de magasin choisi", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    expect(rayonNames()).toEqual([
      "Fruits et légumes",
      "Boulangerie",
      "Épicerie",
      "Santé et beauté",
      "Produits laitiers",
      "Surgelés",
    ]);
  });

  it("renommer un rayon renomme la section de la liste", async () => {
    const { user } = await openRayons();

    const field = screen.getByRole("textbox", { name: "Renommer Collations" });
    await user.clear(field);
    await user.type(field, "Grignotines{Enter}");
    await backToListe(user);

    expect(sectionTitles()).toContain("Grignotines");
  });

  it("Entrée enregistre le nom et laisse le focus dans le champ", async () => {
    const { user } = await openRayons();

    const field = screen.getByRole("textbox", { name: "Renommer Collations" });
    await user.clear(field);
    await user.type(field, "Grignotines{Enter}");

    expect(screen.getByRole("textbox", { name: "Renommer Grignotines" })).toHaveFocus();
  });

  it("après une suppression, le focus passe au rayon suivant", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Supprimer Produits laitiers" }));
    await user.click(screen.getByRole("button", { name: /Confirmer/ }));

    expect(screen.getByRole("button", { name: "Déplacer Surgelés" })).toHaveFocus();
  });

  it("un nom vide garde l'ancien nom", async () => {
    const { user } = await openRayons();

    const field = screen.getByRole("textbox", { name: "Renommer Collations" });
    await user.clear(field);
    await user.tab();

    expect(field).toHaveValue("Collations");
  });

  it("un nouveau rayon arrive en dernier", async () => {
    const { user } = await openRayons();

    await user.type(screen.getByRole("textbox", { name: "Nouveau rayon" }), "Pharmacie{Enter}");

    expect(rayonNames().at(-1)).toBe("Pharmacie");
    expect(screen.getByRole("textbox", { name: "Nouveau rayon" })).toHaveValue("");
  });

  it("supprimer un rayon demande confirmation et dit combien d'articles passent en Non classé", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Supprimer Produits laitiers" }));
    expect(
      screen.getByText("Supprimer Produits laitiers ? 5 articles passeront en Non classé."),
    ).toHaveRole("status");
    await user.click(screen.getByRole("button", { name: /Confirmer/ }));

    expect(rayonNames()).not.toContain("Produits laitiers");
    await backToListe(user);
    expect(section("Non classé").getByRole("button", { name: "Lait" })).toBeVisible();
  });

  it("supprimer un rayon le dit", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Supprimer Produits laitiers" }));
    await user.click(screen.getByRole("button", { name: /Confirmer/ }));

    expect(shownMessages()).toEqual(["Rayon Produits laitiers supprimé"]);
  });

  it("la confirmation de suppression d'un rayon retombe quand le focus quitte le bouton", async () => {
    const { user } = await openRayons();
    await user.click(screen.getByRole("button", { name: "Supprimer Produits laitiers" }));

    await user.tab();

    expect(screen.getByRole("button", { name: "Supprimer Produits laitiers" })).toBeVisible();
  });
});

type User = ReturnType<typeof userEvent.setup>;

describe("ajouter un rayon", () => {
  it("annonce le rayon ajouté", async () => {
    const { user } = await openRayons();

    await user.type(screen.getByRole("textbox", { name: "Nouveau rayon" }), "Boissons{Enter}");

    expect(shownMessages()).toEqual(["Rayon Boissons ajouté"]);
  });
});

describe("déplacer un rayon sans glisser", () => {
  it("« Descendre Hygiène » la met après Épicerie", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Descendre Hygiène" }));

    expect(rayonNames().slice(0, 3)).toEqual(["Vêtements", "Épicerie", "Hygiène"]);
  });

  it("« Monter Hygiène » la met avant Vêtements", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Monter Hygiène" }));

    expect(rayonNames().slice(0, 2)).toEqual(["Hygiène", "Vêtements"]);
  });

  it("annonce la nouvelle position d'Hygiène", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Descendre Hygiène" }));

    expect(screen.getByText("Hygiène en position 3 sur 8.")).toHaveRole("status");
  });

  it("« Monter » ne fait rien sur le premier rayon", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Monter Vêtements" }));

    expect(rayonNames()[0]).toBe("Vêtements");
  });
});

async function openRayons() {
  const { user } = renderApp();
  await user.click(screen.getByRole("button", { name: "Configuration" }));
  return { user };
}

async function backToListe(user: User) {
  await user.click(screen.getByRole("button", { name: "Liste" }));
}

function rayonNames() {
  return within(screen.getByRole("list", { name: "Rayons" }))
    .getAllByRole("textbox")
    .map((field) => (field instanceof HTMLInputElement ? field.value : ""));
}

function sectionTitles() {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
