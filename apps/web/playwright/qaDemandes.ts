import type { Actor, LienResponse } from "@ecureuil/wire";
import { expect, type Page } from "@playwright/test";
import { pause } from "./qaCapture";

/**
 * The invite asks for two things, the proprietaire accepts one and refuses the other, then the
 * invite withdraws the last one waiting.
 */
export async function walkDemandes(page: Page, capture: (name: string) => Promise<unknown>) {
  const inviteLien: LienResponse = { role: "invite", invite: null };
  await page.route("**/lien", (route) => route.fulfill({ json: inviteLien }));
  await page.route("**/journal**", (route) => route.abort());
  await page.goto("/");
  await enterAs(page, "invite");
  for (const name of ["Café", "Thé"]) {
    await page.getByRole("textbox", { name: "Nom" }).fill(name);
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Mes demandes" })).toContainText(name);
  }
  await capture("invite-demandes");
  await page.getByRole("textbox", { name: "Nom" }).fill("lait");
  await page.keyboard.press("Enter");
  await expect(page.getByRole("status")).toHaveText("Déjà sur la liste : lait");
  await capture("invite-deja-sur-la-liste");

  await enterAs(page, "proprietaire");
  await expect(page.getByRole("region", { name: "À valider (3)" })).toBeVisible();
  await capture("a-valider");
  await page.getByRole("button", { name: "Accepter Café" }).click();
  await expect(page.getByRole("region", { name: "À valider (2)" })).toBeVisible();
  await pause(page);
  await page.getByRole("button", { name: "Refuser Thé" }).click();
  await expect(page.getByRole("region", { name: "À valider (1)" })).toBeVisible();
  await capture("a-valider-apres");

  await enterAs(page, "invite");
  // One demande left waiting: one « Retirer » button in the card.
  await expect(
    page.getByRole("region", { name: "Mes demandes" }).getByRole("button"),
  ).toHaveAccessibleName("Retirer Chocolat chaud");
  await capture("invite-verdicts");
  await page.getByRole("button", { name: "Retirer Chocolat chaud" }).click();
  await expect(page.getByRole("region", { name: "Mes demandes" })).toBeHidden();
  await capture("invite-retrait");
}

/**
 * Without a lien the device is the proprietaire's. With one, the role comes from `GET /lien`,
 * answered by `walkDemandes`; the journal routes fail, as offline.
 */
async function enterAs(page: Page, role: Actor) {
  await page.evaluate(
    (lien) =>
      lien === null
        ? localStorage.removeItem("ecureuil.lien")
        : localStorage.setItem("ecureuil.lien", lien),
    role === "invite" ? "secret-qa-invite" : null,
  );
  await page.reload();
}
