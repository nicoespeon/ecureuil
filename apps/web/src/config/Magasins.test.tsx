import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "./renderApp";

describe("les magasins dans la configuration", () => {
  it("un nouveau magasin devient l'onglet actif, avec les rayons par défaut", async () => {
    const { user } = await openRayons();

    await user.type(screen.getByRole("textbox", { name: "Nouveau magasin" }), "IGA{Enter}");

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

  it("la création est annoncée et le champ se vide", async () => {
    const { user } = await openRayons();

    const field = screen.getByRole("textbox", { name: "Nouveau magasin" });
    await user.type(field, "IGA{Enter}");

    expect(screen.getByText("Magasin IGA créé.")).toHaveRole("status");
    expect(field).toHaveValue("");
  });

  it("un nom vide ne crée pas de magasin", async () => {
    const { user } = await openRayons();

    await user.type(screen.getByRole("textbox", { name: "Nouveau magasin" }), "   {Enter}");

    expect(magasinTabNames()).toEqual(["Costco", "Maxi"]);
  });

  it("renommer le magasin renomme son onglet, dans la liste aussi", async () => {
    const { user } = await openRayons();

    const field = screen.getByRole("textbox", { name: "Nom du magasin" });
    await user.clear(field);
    await user.type(field, "Costco Laval{Enter}");
    await user.click(screen.getByRole("button", { name: "Liste" }));

    expect(screen.getByRole("tab", { name: "Costco Laval" })).toBeVisible();
  });
});

async function openRayons() {
  const { user } = renderApp();
  await user.click(screen.getByRole("button", { name: "Configuration" }));
  return { user };
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
