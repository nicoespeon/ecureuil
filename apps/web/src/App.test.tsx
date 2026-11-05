import { seed } from "@ecureuil/domain";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { inMemoryJournal } from "./journal/journal";

describe("la liste d'un magasin", () => {
  it("affiche les rayons de Costco dans son ordre, « Non classé » en dernier", () => {
    renderApp();

    expect(sectionTitles()).toEqual([
      "Vêtements",
      "Hygiène",
      "Épicerie",
      "Collations",
      "Fruits et légumes",
      "Produits laitiers",
      "Non classé",
    ]);
  });

  it("passer à Maxi change les groupes, pas les items", async () => {
    const { user } = renderApp();
    const itemsAtCostco = itemNames();

    await user.click(screen.getByRole("tab", { name: "Maxi" }));
    await user.click(screen.getByRole("button", { name: /Pas chez Maxi/ }));

    expect(sectionTitles()).toEqual([
      "Fruits et légumes",
      "Boulangerie",
      "Épicerie",
      "Santé et beauté",
      "Produits laitiers",
      "Non classé",
      "Pas chez Maxi (1)",
    ]);
    expect(itemNames()).toEqual(itemsAtCostco);
  });

  it("garde le magasin choisi après un remontage", async () => {
    const { user, unmount } = renderApp();
    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    unmount();
    renderApp();

    expect(screen.getByRole("tab", { name: "Maxi" })).toHaveAttribute("aria-selected", "true");
  });
});

describe("le panier", () => {
  it("cocher Lait le met dans le panier", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(section("Dans le panier").getByRole("checkbox", { name: "Lait" })).toBeChecked();
  });

  it("cocher Lait le retire de son rayon", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").queryByRole("checkbox", { name: "Lait" })).toBeNull();
  });

  it("décocher Lait le renvoie dans son rayon", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(section("Dans le panier").getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").getByRole("checkbox", { name: "Lait" })).not.toBeChecked();
  });

  it("relit dans l'ordre d'écriture deux gestes de la même milliseconde", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 10, 4, 18));
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("bbbbbbbb-0000-0000-0000-000000000000")
      .mockReturnValueOnce("aaaaaaaa-0000-0000-0000-000000000000");
    const { user } = renderApp();
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(section("Dans le panier").getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").getByRole("checkbox", { name: "Lait" })).not.toBeChecked();
  });
});

function renderApp() {
  const user = userEvent.setup();
  const { unmount } = render(<App journal={inMemoryJournal(seed)} />);
  return { user, unmount };
}

function sectionTitles() {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

/** Every item on the list, sorted so a different grouping compares equal. */
function itemNames() {
  return screen
    .getAllByRole("checkbox")
    .map((checkbox) => checkbox.getAttribute("aria-label"))
    .sort();
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
