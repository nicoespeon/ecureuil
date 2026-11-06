import { seed } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { act, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { accesStore } from "./acces/acces";
import { inMemoryJournal, type Journal } from "./journal/journal";

describe("la liste d'un magasin", () => {
  it("affiche les rayons de Costco dans son ordre, « Non classé » en dernier", () => {
    renderApp();

    expect(sectionTitles()).toEqual([
      "À valider (1)",
      "Vêtements",
      "Hygiène",
      "Épicerie",
      "Collations",
      "Fruits et légumes",
      "Produits laitiers",
      "Non classé",
    ]);
  });

  it("passer à Maxi change les groupes, pas les articles", async () => {
    const { user } = renderApp();
    const articlesAtCostco = articleNames();

    await user.click(screen.getByRole("tab", { name: "Maxi" }));
    await user.click(screen.getByRole("button", { name: /Pas chez Maxi/ }));

    expect(sectionTitles()).toEqual([
      "À valider (1)",
      "Fruits et légumes",
      "Boulangerie",
      "Épicerie",
      "Santé et beauté",
      "Produits laitiers",
      "Non classé",
      "Pas chez Maxi (1)",
    ]);
    expect(articleNames()).toEqual(articlesAtCostco);
  });

  it("range les articles absents de Maxi dans « Pas chez Maxi »", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    await user.click(screen.getByRole("button", { name: /Pas chez Maxi/ }));

    expect(
      section("Pas chez Maxi (1)").getByRole("button", { name: "Pyjama polaire Gabriel" }),
    ).toBeVisible();
  });

  it("s'affiche quand le stockage de l'appareil est bloqué", () => {
    vi.stubGlobal("localStorage", blockedStorage());

    renderApp();

    expect(screen.getByRole("tab", { name: "Costco" })).toHaveAttribute("aria-selected", "true");
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
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(section("Dans le panier").getByRole("checkbox", { name: "Lait" })).toBeChecked();
  });

  it("cocher Lait le retire de son rayon", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").queryByRole("checkbox", { name: "Lait" })).toBeNull();
  });

  it("décocher Lait le renvoie dans son rayon", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(section("Dans le panier").getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").getByRole("checkbox", { name: "Lait" })).not.toBeChecked();
  });

  it("annonce que Lait est dans le panier", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(screen.getByRole("status")).toHaveTextContent("Lait dans le panier");
  });

  it("cocher Lait donne le focus à l'article suivant", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(screen.getByRole("checkbox", { name: "Yaourts" })).toHaveFocus();
  });

  it("décocher Babybel donne le focus à l'article suivant du panier", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await user.click(section("Dans le panier").getByRole("checkbox", { name: "Babybel" }));

    expect(section("Dans le panier").getByRole("checkbox", { name: "Lait" })).toHaveFocus();
  });

  it("relit dans l'ordre d'écriture deux gestes de la même milliseconde", async () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 10, 4, 18));
    vi.spyOn(crypto, "randomUUID")
      .mockReturnValueOnce("bbbbbbbb-0000-0000-0000-000000000000")
      .mockReturnValueOnce("aaaaaaaa-0000-0000-0000-000000000000");
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(section("Dans le panier").getByRole("checkbox", { name: "Lait" }));

    expect(section("Produits laitiers").getByRole("checkbox", { name: "Lait" })).not.toBeChecked();
  });
});

describe("la quantité", () => {
  it("en Courses, n'affiche pas de multiplicateur pour un seul Babybel", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(row("Babybel")).not.toHaveTextContent("×");
  });

  it("« + » augmente la quantité de Babybel", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Augmenter la quantité de Babybel" }));

    expect(screen.getByRole("group", { name: "Quantité de Babybel" })).toHaveTextContent("2");
  });

  it("« − » diminue la quantité de Lait", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Diminuer la quantité de Lait" }));

    expect(screen.getByRole("group", { name: "Quantité de Lait" })).toHaveTextContent("2");
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

    expect(screen.queryByRole("button", { name: "Babybel" })).toBeNull();
  });

  it("donne le focus à la poubelle de l'article suivant après le retrait de Babybel", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Retirer Babybel de la liste" }));

    await user.click(screen.getByRole("button", { name: "Retirer Babybel ?" }));

    expect(screen.getByRole("button", { name: "Retirer Lait de la liste" })).toHaveFocus();
  });

  it("donne le focus à la poubelle de l'article précédent après le retrait du dernier de la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Retirer Fromage râpé de la liste" }));

    await user.click(screen.getByRole("button", { name: "Retirer Fromage râpé ?" }));

    expect(screen.getByRole("button", { name: "Retirer Croissants de la liste" })).toHaveFocus();
  });

  it("la confirmation retombe après 3 secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = renderApp();
    await user.click(screen.getByRole("button", { name: "Retirer Babybel de la liste" }));

    await act(() => vi.advanceTimersByTimeAsync(3000));

    expect(screen.getByRole("button", { name: "Retirer Babybel de la liste" })).toBeVisible();
  });
});

describe("terminer les courses", () => {
  it("est caché quand le panier est vide", async () => {
    const { user } = renderApp();
    await startCourses(user);

    expect(screen.queryByRole("button", { name: "Terminer les courses" })).toBeNull();
  });

  it("compte le panier et ce qui reste à acheter avant de terminer", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await user.click(screen.getByRole("button", { name: "Terminer les courses" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent(
      "2 articles dans le panier, 8 restent à acheter",
    );
  });

  it("accorde un panier d'un seul article au singulier", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(screen.getByRole("button", { name: "Terminer les courses" }));

    expect(screen.getByRole("alertdialog")).toHaveTextContent("1 article dans le panier");
  });

  it("vide le panier", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await finishSortie(user);

    expect(screen.queryByRole("region", { name: "Dans le panier" })).toBeNull();
  });

  it("laisse les autres articles à acheter", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await finishSortie(user);

    expect(articleNames()).toEqual([
      "Champignons",
      "Croissants",
      "Fromage râpé",
      "Nutella",
      "Pretzel Crisps",
      "Pyjama polaire Gabriel",
      "Shampooing",
      "Yaourts",
    ]);
  });

  it("rend le focus à la liste une fois les courses terminées", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await finishSortie(user);

    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });

  it("« Annuler » garde le panier", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);
    await user.click(screen.getByRole("button", { name: "Terminer les courses" }));

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(section("Dans le panier").getAllByRole("checkbox")).toHaveLength(2);
  });
});

describe("un appareil sans magasin", () => {
  it("affiche Écureuil et explique comment synchroniser la liste du foyer", () => {
    renderApp({ journal: inMemoryJournal([]) });

    expect(screen.getByRole("heading", { level: 1, name: "Écureuil" })).toBeVisible();
    expect(screen.getByText(/lien d'accès/)).toBeVisible();
  });

  it("sans lien, propose de coller le lien d'accès", () => {
    renderApp({ journal: inMemoryJournal([]) });

    expect(screen.getByRole("textbox", { name: "Lien d'accès" })).toBeVisible();
  });

  it("montre la liste dès que la synchronisation apporte un magasin", () => {
    const journal = inMemoryJournal([]);
    renderApp({ journal });

    act(() => {
      for (const event of seed) void journal.append(event);
    });

    expect(screen.getByRole("tab", { name: "Costco" })).toHaveAttribute("aria-selected", "true");
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}

async function checkLaitAndBabybel(user: User) {
  await user.click(screen.getByRole("checkbox", { name: "Lait" }));
  await user.click(screen.getByRole("checkbox", { name: "Babybel" }));
}

async function finishSortie(user: User) {
  await user.click(screen.getByRole("button", { name: "Terminer les courses" }));
  await user.click(screen.getByRole("button", { name: "Terminer" }));
}

function renderApp({
  journal = inMemoryJournal(seed),
  role = "proprietaire",
}: {
  journal?: Journal;
  role?: Actor;
} = {}) {
  const user = userEvent.setup();
  const acces = accesStore({ apiUrl: undefined, secret: null, reload: () => {} });
  const { unmount } = render(<App journal={journal} role={role} acces={acces} />);
  return { user, unmount };
}

function sectionTitles() {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

/** Every article to buy, by its trash in Préparer, sorted so a different grouping compares equal. */
function articleNames() {
  return screen
    .getAllByRole("button", { name: /^Retirer .+ de la liste$/ })
    .map((trash) => trash.textContent?.replace(/^Retirer (.+) de la liste$/, "$1"))
    .sort();
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}

function row(articleName: string) {
  return screen.getByRole("button", { name: articleName }).closest("li");
}

/** What a browser hands out when site storage is disabled: every access throws. */
function blockedStorage() {
  const blocked = () => {
    throw new DOMException("Storage blocked", "SecurityError");
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked, clear: blocked };
}
