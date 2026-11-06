import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";

describe("l'ajout rapide", () => {
  it("« Ajouter » ouvre le champ de recherche avec le focus", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(screen.getByRole("searchbox", { name: "Item à ajouter" })).toHaveFocus();
  });

  it("propose les items achetés à la dernière sortie", async () => {
    const { user } = renderApp();
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
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));
    await finishSortie(user);
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.click(screen.getByRole("button", { name: "Lait" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(listSection("Produits laitiers").getByRole("checkbox", { name: "Lait" })).toBeVisible();
  });

  it("taper « pom » trouve Pommes, qu'un tap met sur la liste", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));
    await user.click(screen.getByRole("button", { name: "Fermer" }));

    expect(
      listSection("Fruits et légumes").getByRole("checkbox", { name: "Pommes" }),
    ).toBeVisible();
  });

  it("annonce l'item ajouté", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(within(screen.getByRole("dialog")).getByRole("status")).toHaveTextContent(
      "Sur la liste : Pommes",
    );
  });

  it("après un ajout, le champ se vide et garde le focus pour enchaîner", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(searchbox()).toHaveValue("");
    expect(searchbox()).toHaveFocus();
  });

  it("un item déjà sur la liste l'indique, sans bouton", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "lait");

    expect(within(resultRow("Lait")).queryByRole("button")).toBeNull();
    expect(resultRow("Lait")).toHaveTextContent("Sur la liste");
  });

  it("un item pas vendu dans ce magasin le dit", async () => {
    const { user } = renderApp();
    await user.click(screen.getByRole("tab", { name: "Maxi" }));
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    await user.type(searchbox(), "pyjama");

    expect(resultRow("Pyjama polaire Gabriel")).toHaveTextContent("Pas chez Maxi");
  });

  it("« Créer « Laitue » » ouvre sa fiche, l'item déjà à acheter", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "Laitue");
    await user.click(screen.getByRole("button", { name: "Créer « Laitue »" }));

    expect(
      within(screen.getByRole("dialog", { name: "Laitue" })).getByRole("checkbox", {
        name: "À acheter",
      }),
    ).toBeChecked();
  });

  it("fermer la fiche de l'item créé ramène au champ, vide, avec le focus", async () => {
    const { user } = await openAjout();
    await user.type(searchbox(), "Laitue{Enter}");

    await closeDialog(user, "Laitue");

    expect(searchbox()).toHaveValue("");
    expect(searchbox()).toHaveFocus();
  });

  it("l'item créé arrive dans « Non classé »", async () => {
    const { user } = await openAjout();
    await user.type(searchbox(), "Laitue{Enter}");

    await closeDialog(user, "Laitue");
    await closeDialog(user, "Ajouter à la liste");

    expect(listSection("Non classé").getByRole("checkbox", { name: "Laitue" })).toBeVisible();
  });

  it("un item existant choisi dans les résultats n'ouvre pas de fiche", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pom");
    await user.click(screen.getByRole("button", { name: "Pommes" }));

    expect(screen.queryByRole("dialog", { name: "Pommes" })).toBeNull();
  });

  it("Entrée ajoute le premier résultat", async () => {
    const { user } = await openAjout();

    await user.type(searchbox(), "pomm{Enter}");
    await closeDialog(user, "Ajouter à la liste");

    expect(screen.getByRole("checkbox", { name: "Pommes" })).toBeVisible();
  });

  it("Entrée sur le nom d'un item déjà sur la liste le dit, sans rien ajouter", async () => {
    const { user, journal } = await openAjout();
    const before = journal.all().length;

    await user.type(searchbox(), "lait{Enter}");

    expect(within(screen.getByRole("dialog")).getByRole("status")).toHaveTextContent(
      "Déjà sur la liste : Lait",
    );
    expect(journal.all()).toHaveLength(before);
  });

  it.each([
    ["pom", "1 item trouvé"],
    ["lai", "2 items trouvés"],
    ["kiwi", "Aucun item trouvé"],
  ])("taper « %s » annonce « %s »", async (query, announcement) => {
    const { user } = await openAjout();

    await user.type(searchbox(), query);

    expect(within(screen.getByRole("dialog")).getByRole("status")).toHaveTextContent(announcement);
  });

  it("n'est pas proposé à l'invité", () => {
    renderApp({ role: "invite" });

    expect(screen.queryByRole("button", { name: "Ajouter" })).toBeNull();
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
  return screen.getByRole("searchbox", { name: "Item à ajouter" });
}

/** A row of the search results, whether it can be added or not. */
function resultRow(name: string) {
  const row = within(screen.getByRole("list", { name: "Résultats" }))
    .getAllByRole("listitem")
    .find((item) => item.textContent?.startsWith(name));
  if (!row) throw new Error(`No result for ${name}`);
  return row;
}

function listSection(name: string) {
  return within(screen.getByRole("region", { name }));
}
