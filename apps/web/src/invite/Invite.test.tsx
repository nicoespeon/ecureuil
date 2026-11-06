import { seed } from "@ecureuil/domain";
import type { Actor } from "@ecureuil/wire";
import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";
import { appendEvent, type EventType, type PayloadOf } from "../journal/appendEvent";
import { inMemoryJournal } from "../journal/journal";

describe("la liste vue par l'invité", () => {
  it("montre les items du magasin sans case à cocher ni « Terminer les courses »", () => {
    renderApp({ role: "invite" });

    expect(section("Produits laitiers").getByText("Lait")).toBeVisible();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.queryByRole("button", { name: /Terminer les courses/ })).toBeNull();
  });

  it("ne donne pas accès à la configuration", () => {
    renderApp({ role: "invite" });

    expect(screen.queryByRole("button", { name: "Configuration" })).toBeNull();
  });

  it("montre la quantité à côté de Lait", () => {
    renderApp({ role: "invite" });

    expect(section("Produits laitiers").getByText("Lait").closest("li")).toHaveTextContent(
      "Lait×3",
    );
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

  it("la demande apparaît en attente dans « Mes demandes »", async () => {
    const { user } = renderApp({ role: "invite" });

    await user.type(screen.getByRole("textbox", { name: "Nom" }), "Café");
    await user.click(screen.getByRole("button", { name: "Ajouter" }));

    expect(section("Mes demandes").getAllByRole("listitem")[0]).toHaveTextContent(
      "Café, en attente",
    );
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
  it("dit ce que le propriétaire a fait de chaque demande, la plus récente d'abord", () => {
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
      written("proprietaire", "ItemCreated", { itemId: "item-cafe", name: "Café" }),
    );
    appendEvent(
      journal,
      written("proprietaire", "DemandeAccepted", {
        demandeId: "demande-cafe",
        itemId: "item-cafe",
      }),
    );
    appendEvent(
      journal,
      written("proprietaire", "DemandeRefused", { demandeId: "demande-chocolat-chaud" }),
    );

    renderApp({ role: "invite", journal });

    expect(statuses()).toEqual([
      "Thé, en attente",
      "Café, dans la liste",
      "Chocolat chaud, pas cette fois",
    ]);
  });
});

function written<T extends EventType>(actor: Actor, type: T, payload: PayloadOf<T>) {
  return { actor, type, magasin: "magasin-costco", payload };
}

function statuses() {
  return section("Mes demandes")
    .getAllByRole("listitem")
    .map((item) => item.textContent);
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
