import { ArticleRayon, Event } from "@ecureuil/wire";
import { screen } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { Schema } from "effect";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";
import { inMemoryJournal } from "../journal/journal";

type Foyer = { readonly onTheList: ReadonlyArray<"lait" | "pain" | "biere"> };

/** Lait ×3 and Pain on the Costco list; the 6 bières are not sold there. */
const foyer: Foyer = { onTheList: ["lait", "pain", "biere"] };

describe("le compteur d'articles, en unités", () => {
  it("en Préparer, compte les unités prévues en articles, sans ce qui n'est pas vendu ici", () => {
    renderFoyer(foyer);

    expect(screen.getByText("4 articles")).toBeInTheDocument();
  });

  it("en Préparer, dit « 1 article » au singulier", () => {
    renderFoyer({ ...foyer, onTheList: ["pain"] });

    expect(screen.getByText("1 article")).toBeInTheDocument();
  });

  it("en Courses, lit les unités du panier sur les unités prévues", async () => {
    const { user } = renderFoyer(foyer);
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(screen.getByText("3 articles dans le panier sur 4 prévus")).toBeInTheDocument();
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

    expect(screen.getByText("0 article dans le panier sur 4 prévus")).toBeInTheDocument();
  });

  it("sans rien à acheter ni dans le panier, pas de compteur", () => {
    renderFoyer({ ...foyer, onTheList: ["biere"] });

    expect(screen.queryByText(/article/)).toBeNull();
  });
});

type User = ReturnType<typeof userEvent.setup>;

function renderFoyer({ onTheList }: Foyer) {
  return renderApp({ journal: inMemoryJournal(journalOf(onTheList)) });
}

const decodeEvent = Schema.decodeUnknownSync(Event);

/** One magasin, one rayon, three articles: Lait ×3 in the rayon, Pain non classé, Bière ×6 not sold here. */
function journalOf(onTheList: Foyer["onTheList"]) {
  const drafts = [
    { type: "MagasinCreated", magasin: "costco", payload: { name: "Costco" } },
    { type: "RayonCreated", magasin: "costco", payload: { rayonId: "laitier", name: "Laitier" } },
    { type: "ArticleCreated", magasin: null, payload: { articleId: "lait", name: "Lait" } },
    { type: "ArticleCreated", magasin: null, payload: { articleId: "pain", name: "Pain" } },
    { type: "ArticleCreated", magasin: null, payload: { articleId: "biere", name: "Bière" } },
    { type: "ArticleQuantitySet", magasin: null, payload: { articleId: "lait", quantity: 3 } },
    { type: "ArticleQuantitySet", magasin: null, payload: { articleId: "biere", quantity: 6 } },
    {
      type: "ArticleRayonSet",
      magasin: "costco",
      payload: { articleId: "lait", rayon: ArticleRayon.cases.Rayon.make({ rayonId: "laitier" }) },
    },
    {
      type: "ArticleRayonSet",
      magasin: "costco",
      payload: { articleId: "biere", rayon: ArticleRayon.cases.PasVenduIci.make({}) },
    },
    ...onTheList.map((articleId) => ({
      type: "ArticleMarkedToBuy",
      magasin: null,
      payload: { articleId },
    })),
  ];
  return drafts.map((draft, index) =>
    decodeEvent({
      id: `compteur-${index}`,
      at: index + 1,
      actor: "proprietaire",
      device: "test",
      ...draft,
    }),
  );
}

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}
