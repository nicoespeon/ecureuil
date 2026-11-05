import { seed } from "@ecureuil/domain";
import { act, render, screen, within } from "@testing-library/react";
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

describe("la quantité", () => {
  it("affiche ×3 à côté de Lait", () => {
    renderApp();

    expect(row("Lait")).toHaveTextContent("Lait×3");
  });

  it("n'affiche pas de multiplicateur pour un seul Babybel", () => {
    renderApp();

    expect(row("Babybel")).not.toHaveTextContent("×");
  });

  it("« + » augmente la quantité de Babybel", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Augmenter la quantité de Babybel" }));

    expect(screen.getByRole("group", { name: "Quantité de Babybel" })).toHaveTextContent("2");
  });

  it("« − » est désactivé à 1", () => {
    renderApp();

    expect(screen.getByRole("button", { name: "Diminuer la quantité de Babybel" })).toBeDisabled();
  });

  it("« + » est désactivé à 10", async () => {
    const { user } = renderApp();
    const increase = screen.getByRole("button", { name: "Augmenter la quantité de Babybel" });

    for (let quantity = 1; quantity < 10; quantity++) await user.click(increase);

    expect(increase).toBeDisabled();
  });
});

describe("retirer de la liste", () => {
  it("un premier tap sur la poubelle demande confirmation", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Retirer Babybel de la liste" }));

    expect(screen.getByRole("status")).toHaveTextContent("Touchez encore pour retirer Babybel");
  });

  it("un second tap retire Babybel de la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Retirer Babybel de la liste" }));

    await user.click(screen.getByRole("button", { name: "Retirer Babybel ?" }));

    expect(screen.queryByRole("checkbox", { name: "Babybel" })).toBeNull();
  });

  it("la confirmation retombe après 3 secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Retirer Babybel de la liste" }));

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(screen.getByRole("button", { name: "Retirer Babybel de la liste" })).toBeVisible();
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

function row(itemName: string) {
  return screen.getByRole("checkbox", { name: itemName }).closest("li");
}
