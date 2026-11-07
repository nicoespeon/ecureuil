import { type FoyerSeed, foyerJournal } from "@ecureuil/domain";
import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";
import { inMemoryJournal } from "../journal/journal";

/** Lait ×3 and Pain on the Costco list; the 6 bières are not sold there. */
const foyer: FoyerSeed = {
  magasins: [
    {
      slug: "costco",
      name: "Costco",
      rayons: { laitier: "Laitier" },
      placements: { lait: "laitier", biere: "PasVenduIci" },
    },
  ],
  articles: { lait: "Lait", pain: "Pain", biere: "Bière" },
  quantities: { lait: 3, biere: 6 },
  onTheList: ["lait", "pain", "biere"],
};

describe("le compteur d'unités", () => {
  it("en Préparer, compte les unités prévues sans ce qui n'est pas vendu ici", () => {
    renderFoyer(foyer);

    expect(screen.getByText("4 unités")).toBeInTheDocument();
  });

  it("en Courses, lit les unités du panier sur les unités prévues", async () => {
    const { user } = renderFoyer(foyer);
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(screen.getByText("3 unités dans le panier sur 4 prévues")).toBeInTheDocument();
  });

  it("en Courses, affiche « 3 / 4 » à côté de « Terminer les courses »", async () => {
    const { user } = renderFoyer(foyer);
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(screen.getByText("3 / 4")).toBeInTheDocument();
  });

  it("en Courses, compte dès le panier vide", async () => {
    const { user } = renderFoyer(foyer);

    await startCourses(user);

    expect(screen.getByText("0 unité dans le panier sur 4 prévues")).toBeInTheDocument();
  });

  it("sans rien à acheter ni dans le panier, pas de compteur", () => {
    renderFoyer({ ...foyer, onTheList: ["biere"] });

    expect(screen.queryByText(/unité/)).toBeNull();
  });
});

type User = ReturnType<typeof userEvent.setup>;

function renderFoyer(seed: FoyerSeed) {
  return renderApp({ journal: inMemoryJournal(foyerJournal(seed, "compteur")) });
}

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}
