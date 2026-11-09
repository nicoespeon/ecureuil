import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp, shownMessages } from "../config/renderApp";

describe("l'ajout rapide", () => {
  it("« Ajouter » ouvre le champ de recherche avec le focus", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByRole("searchbox", { name: "Article à ajouter" })).toHaveFocus();
  });

  it("propose les articles achetés à la dernière sortie", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("switch", { name: "Courses" }));
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));
    await finishSortie(user);

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(
      within(screen.getByRole("region", { name: "Fréquents" })).getByRole("button", {
        name: "Lait",
      }),
    ).toBeVisible();
  });

  it("un tap sur un fréquent le remet sur la liste", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("switch", { name: "Courses" }));
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));
    await finishSortie(user);
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.click(screen.getByRole("button", { name: "Lait" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(listSection("Produits laitiers").getByRole("button", { name: "Lait" })).toBeVisible();
  });

  it("taper « pom » trouve Pommes, qu'un tap met sur la liste", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(listSection("Fruits et légumes").getByRole("button", { name: "Pommes" })).toBeVisible();
  });

  it("annonce l'article ajouté", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(shownMessages()).toEqual(["Sur la liste : Pommes"]);
  });

  it("après un ajout, le champ se vide et garde le focus pour enchaîner", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(searchbox()).toHaveValue("");
    expect(searchbox()).toHaveFocus();
  });

  it("un article déjà sur la liste l'indique, sans bouton", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "lait");

    expect(within(resultRow("Lait")).queryByRole("button")).toBeNull();
    expect(resultRow("Lait")).toHaveTextContent("Sur la liste");
  });

  it("un article pas vendu dans ce magasin le dit", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("tab", { name: "Maxi" }));
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.type(searchbox(), "pyjama");

    expect(resultRow("Pyjama polaire Gabriel")).toHaveTextContent("Pas chez Maxi");
  });

  it("« Créer « Laitue » » ouvre sa fiche, l'article déjà à acheter", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "Laitue");
    await user.click(screen.getByRole("button", { name: "Créer « Laitue »" }));

    expect(
      within(screen.getByRole("dialog", { name: "Laitue" })).getByRole("checkbox", {
        name: "À acheter",
      }),
    ).toBeChecked();
  });

  it("annonce l'article créé, même sa fiche ouverte", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "Laitue{Enter}");

    expect(shownMessages()).toEqual(["Sur la liste : Laitue"]);
  });

  it("fermer la fiche de l'article créé ramène au champ, vide, avec le focus", async () => {
    const { user } = await openAjout();
    await user.type(searchbox(), "Laitue{Enter}");

    await closeDialog(user, "Laitue");

    expect(searchbox()).toHaveValue("");
    expect(searchbox()).toHaveFocus();
  });

  it("l'article créé arrive dans « Non classé »", async () => {
    const { user } = await openAjout();
    await user.type(searchbox(), "Laitue{Enter}");

    await closeDialog(user, "Laitue");
    await closeDialog(user, "Ajouter à la liste");

    expect(listSection("Non classé").getByRole("button", { name: "Laitue" })).toBeVisible();
  });

  it("un article existant choisi dans les résultats n'ouvre pas de fiche", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(screen.queryByRole("dialog", { name: "Pommes" })).toBeNull();
  });

  it("Entrée ajoute le premier résultat", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pomm{Enter}");
    await closeDialog(user, "Ajouter à la liste");

    expect(screen.getByRole("button", { name: "Pommes" })).toBeVisible();
  });

  it("Entrée sur le nom d'un article déjà sur la liste le dit, sans rien ajouter", async () => {
    const { user, journal } = await openAjout();
    const before = journal.all().length;

    await user.type(searchbox(), "lait{Enter}");

    expect(shownMessages()).toEqual(["Déjà sur la liste : Lait"]);
    expect(journal.all()).toHaveLength(before);
  });

  it.each([
    ["pom", "1 article trouvé"],
    ["lai", "2 articles trouvés"],
    ["kiwi", "Aucun article trouvé"],
  ])("taper « %s » annonce « %s »", async (query, announcement) => {
    const { user } = await openAjout();

    await user.type(searchbox(), query);

    expect(await within(screen.getByRole("dialog")).findByText(announcement)).toHaveRole("status");
  });

  it("« Déjà sur la liste » n'est pas couvert par le compte des résultats", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "lait{Enter}");
    await new Promise((resolve) => setTimeout(resolve, 600));

    expect(shownMessages()).toEqual(["Déjà sur la liste : Lait"]);
  });

  it("rouvert, ne répète pas la dernière annonce", async () => {
    const { user } = await openAjout();
    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(within(screen.getByRole("dialog")).getByRole("status")).toBeEmptyDOMElement();
  });

  it("ne compte les résultats qu'une fois la frappe posée, pour ne pas couvrir l'écho du clavier", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "lai");

    expect(within(screen.getByRole("dialog")).getByRole("status")).toBeEmptyDOMElement();
  });

  it("n'est pas proposé à l'invité : son « Ajouter » envoie une demande", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.queryByRole("searchbox", { name: "Article à ajouter" })).toBeNull();
  });
});

type User = ReturnType<typeof renderApp>["user"];

async function openAjout() {
  const app = renderApp();
  await app.user.click(screen.getByRole("button", { name: "Ajouter" }));
  return app;
}

async function finishSortie(user: User) {
  await user.click(screen.getByRole("button", { name: "Terminer les courses" }));
  await user.click(screen.getByRole("button", { name: "Terminer" }));
}

async function closeDialog(user: User, name: string) {
  await user.click(
    within(screen.getByRole("dialog", { name })).getByRole("button", { name: "Fermer" }),
  );
}

function searchbox() {
  return screen.getByRole("searchbox", { name: "Article à ajouter" });
}

/** A row of the search results, whether it can be added or not. */
function resultRow(name: string) {
  const row = within(screen.getByRole("list", { name: "Résultats" }))
    .getAllByRole("listitem")
    .find((article) => article.textContent?.startsWith(name));
  if (!row) throw new Error(`No result for ${name}`);
  return row;
}

function listSection(name: string) {
  return within(screen.getByRole("region", { name }));
}
