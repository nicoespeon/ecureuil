import { seed } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";
import { appendEvent, type EventType, type PayloadOf } from "../journal/appendEvent";
import { inMemoryJournal } from "../journal/journal";

describe("l'écran de l'invité", () => {
  it("ne montre ni onglet Magasin ni la liste", () => {
    renderApp({ role: "invite" });

    expect(screen.queryByRole("tablist", { name: "Magasin" })).toBeNull();
    expect(screen.queryByText("Lait")).toBeNull();
  });

  it("ne donne pas accès à la configuration", () => {
    renderApp({ role: "invite" });

    expect(screen.queryByRole("button", { name: "Configuration" })).toBeNull();
  });
});

describe("ajouter une demande", () => {
  it("« Ajouter » écrit une demande au nom de l'invité", async () => {
    const { user, journal } = renderApp({ role: "invite" });

    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café{Enter}");

    expect(journal.all().at(-1)).toMatchObject({
      type: "DemandeCreated",
      actor: "invite",
      payload: { name: "Café" },
    });
  });

  it("la demande apparaît en haut de « Mes demandes »", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(demandeNames()).toEqual(["Café", "Chocolat chaud"]);
  });

  it("vide le champ et y laisse le focus pour la demande suivante", async () => {
    const { user } = renderApp({ role: "invite" });
    const field = screen.getByRole("textbox", { name: "Nom" });

    await user.type(field, "Café{Enter}");

    expect(field).toHaveValue("");
    expect(field).toHaveFocus();
  });

  it("annonce la demande envoyée", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café{Enter}");

    expect(screen.getByRole("status")).toHaveTextContent("Café demandé");
  });

  it("n'envoie rien sans nom", async () => {
    const { user, journal } = renderApp({ role: "invite" });
    const before = journal.all().length;

    await user.type(screen.getByRole("textbox", { name: "Nom" }), "   {Enter}");

    expect(journal.all()).toHaveLength(before);
  });
});

describe("une demande en double", () => {
  it.each([
    ["lait", "Déjà sur la liste"],
    ["chocolat chaud", "Déjà demandé"],
  ])("« %s » n'envoie rien et affiche « %s »", async (name, message) => {
    const { user, journal } = renderApp({ role: "invite" });
    const before = journal.all().length;

    await user.type(screen.getByRole("textbox", { name: "Nom" }), `${name}{Enter}`);

    expect(journal.all()).toHaveLength(before);
    expect(screen.getByRole("status")).toHaveTextContent(message);
    expect(screen.getByRole("status")).toBeVisible();
  });

  it("vide le champ", async () => {
    const { user } = renderApp({ role: "invite" });
    const field = screen.getByRole("textbox", { name: "Nom" });

    await user.type(field, "lait{Enter}");

    expect(field).toHaveValue("");
  });
});

describe("mes demandes", () => {
  it("ne montre que les demandes en attente", () => {
    const journal = inMemoryJournal(seed);
    appendEvent(
      journal,
      written("invite", "DemandeCreated", { demandeId: "demande-cafe", name: "Café" }),
    );
    appendEvent(
      journal,
      written("invite", "DemandeCreated", { demandeId: "demande-the", name: "Thé" }),
    );
    appendEvent(
      journal,
      written("proprietaire", "ArticleCreated", { articleId: "article-cafe", name: "Café" }),
    );
    appendEvent(
      journal,
      written("proprietaire", "DemandeAccepted", {
        demandeId: "demande-cafe",
        articleId: "article-cafe",
      }),
    );
    appendEvent(
      journal,
      written("proprietaire", "DemandeRefused", { demandeId: "demande-chocolat-chaud" }),
    );

    renderApp({ role: "invite", journal });

    expect(demandeNames()).toEqual(["Thé"]);
  });

  it("disparaît quand plus rien n'attend", () => {
    const journal = inMemoryJournal(seed);
    appendEvent(
      journal,
      written("proprietaire", "DemandeRefused", { demandeId: "demande-chocolat-chaud" }),
    );

    renderApp({ role: "invite", journal });

    expect(screen.queryByRole("region", { name: "Mes demandes" })).toBeNull();
  });

  it("sans demande, dit quoi faire", () => {
    const journal = inMemoryJournal(seed);
    appendEvent(
      journal,
      written("proprietaire", "DemandeRefused", { demandeId: "demande-chocolat-chaud" }),
    );

    renderApp({ role: "invite", journal });

    expect(
      screen.getByText(
        "Écrivez ce qu'il manque : vos demandes attendent ici qu'on les mette sur la liste.",
      ),
    ).toBeVisible();
  });
});

describe("retirer une demande", () => {
  it("écrit DemandeWithdrawn au nom de l'invité", async () => {
    const { user, journal } = renderApp({ role: "invite" });

    await user.click(screen.getByRole("button", { name: "Retirer Chocolat chaud" }));

    expect(journal.all().at(-1)).toMatchObject({
      type: "DemandeWithdrawn",
      actor: "invite",
      payload: { demandeId: "demande-chocolat-chaud" },
    });
  });

  it("la demande retirée quitte « Mes demandes »", async () => {
    const { user } = renderApp({ role: "invite" });
    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café{Enter}");

    await user.click(screen.getByRole("button", { name: "Retirer Chocolat chaud" }));

    expect(demandeNames()).toEqual(["Café"]);
  });

  it("annonce le retrait", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.click(screen.getByRole("button", { name: "Retirer Chocolat chaud" }));

    expect(screen.getByRole("status")).toHaveTextContent("Chocolat chaud retiré");
  });

  it("donne le focus à la demande suivante", async () => {
    const { user } = renderApp({ role: "invite" });
    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café{Enter}");

    await user.click(screen.getByRole("button", { name: "Retirer Café" }));

    expect(screen.getByRole("button", { name: "Retirer Chocolat chaud" })).toHaveFocus();
  });

  it("rend le focus au champ après la dernière demande", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.click(screen.getByRole("button", { name: "Retirer Chocolat chaud" }));

    expect(screen.getByRole("textbox", { name: "Nom" })).toHaveFocus();
  });
});

function written<T extends EventType>(actor: Actor, type: T, payload: PayloadOf<T>) {
  return { actor, type, magasin: "magasin-costco", payload };
}

/** Each row of « Mes demandes » has its « Retirer <nom> » button: the names, in order. */
function demandeNames() {
  return section("Mes demandes")
    .getAllByRole("button", { name: /^Retirer / })
    .map((button) => button.textContent?.replace(/^Retirer /, ""));
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
