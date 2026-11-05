import { fold, seed } from "@ecureuil/domain";
import { cleanup, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp } from "../config/renderApp";
import { appendEvent } from "../journal/appendEvent";
import { inMemoryJournal, type Journal } from "../journal/journal";

describe("la section « À valider »", () => {
  it("ouvre la liste avec les demandes de l'invité", () => {
    renderApp();

    expect(screen.getAllByRole("heading", { level: 2 })[0]).toHaveTextContent("À valider (1)");
    expect(section("À valider (1)").getByRole("listitem")).toHaveTextContent(/^Chocolat chaud/);
  });

  it("accepter met Chocolat chaud sur la liste, en « Non classé »", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Accepter Chocolat chaud" }));

    expect(section("Non classé").getByRole("checkbox", { name: "Chocolat chaud" })).toBeVisible();
    expect(screen.queryByRole("region", { name: /À valider/ })).toBeNull();
  });

  it("accepter « beurre » réutilise l'item Beurre du catalogue", async () => {
    const { user, journal } = renderApp({ journal: withDemande("beurre") });

    await user.click(screen.getByRole("button", { name: "Accepter beurre" }));

    expect(screen.getAllByRole("checkbox", { name: "Beurre" })).toHaveLength(1);
    expect(journal.all().at(-1)).toMatchObject({
      type: "DemandeAccepted",
      payload: { itemId: "item-beurre" },
    });
  });

  it("accepter sur deux appareils avant la sync ne crée qu'un seul Chocolat chaud", async () => {
    const phone = await acceptChocolatChaudOn(inMemoryJournal(seed));
    const mac = await acceptChocolatChaudOn(inMemoryJournal(seed));

    const catalogue = Object.values(fold([...phone.all(), ...mac.all()]).items);

    expect(catalogue.filter((item) => item.name === "Chocolat chaud")).toHaveLength(1);
  });

  it("refuser retire la demande sans toucher la liste", async () => {
    const { user, journal } = renderApp();
    const listed = screen.getAllByRole("checkbox").length;

    await user.click(screen.getByRole("button", { name: "Refuser Chocolat chaud" }));

    expect(screen.queryByRole("region", { name: /À valider/ })).toBeNull();
    expect(screen.getAllByRole("checkbox")).toHaveLength(listed);
    expect(journal.all().at(-1)).toMatchObject({ type: "DemandeRefused", actor: "proprietaire" });
  });

  it.each([
    ["Accepter", "Chocolat chaud ajouté à la liste"],
    ["Refuser", "Chocolat chaud refusé"],
  ])("« %s » annonce « %s »", async (verdict, announcement) => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: `${verdict} Chocolat chaud` }));

    expect(screen.getByRole("status")).toHaveTextContent(announcement);
  });

  it("donne le focus à la demande suivante après un verdict", async () => {
    const { user } = renderApp({ journal: withDemande("Café") });

    await user.click(screen.getByRole("button", { name: "Refuser Chocolat chaud" }));

    expect(screen.getByRole("button", { name: "Accepter Café" })).toHaveFocus();
  });

  it("rend le focus à la liste après la dernière demande", async () => {
    const { user } = renderApp();

    await user.click(screen.getByRole("button", { name: "Accepter Chocolat chaud" }));

    expect(screen.getByRole("tabpanel")).toHaveFocus();
  });
});

async function acceptChocolatChaudOn(device: Journal) {
  const { user } = renderApp({ journal: device });
  await user.click(screen.getByRole("button", { name: "Accepter Chocolat chaud" }));
  cleanup();
  return device;
}

/** The seed, where the invite has asked for one more thing after the Chocolat chaud. */
function withDemande(name: string) {
  const journal = inMemoryJournal(seed);
  appendEvent(journal, {
    actor: "invite",
    type: "DemandeCreated",
    magasin: "magasin-costco",
    payload: { demandeId: "demande-suivante", name },
  });
  return journal;
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}
