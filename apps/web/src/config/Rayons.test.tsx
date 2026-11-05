import { seed } from "@ecureuil/domain";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { App } from "../App";
import { inMemoryJournal } from "../journal/journal";

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

  it("supprimer un rayon demande confirmation et dit combien d'items passent en Non classé", async () => {
    const { user } = await openRayons();

    await user.click(screen.getByRole("button", { name: "Supprimer Produits laitiers" }));
    expect(
      screen.getByText("Supprimer Produits laitiers ? 5 items passeront en Non classé."),
    ).toHaveRole("status");
    await user.click(screen.getByRole("button", { name: /Confirmer/ }));

    expect(rayonNames()).not.toContain("Produits laitiers");
    await backToListe(user);
    expect(section("Non classé").getByRole("checkbox", { name: "Lait" })).toBeVisible();
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function openRayons() {
  const user = userEvent.setup();
  render(<App journal={inMemoryJournal(seed)} />);
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
