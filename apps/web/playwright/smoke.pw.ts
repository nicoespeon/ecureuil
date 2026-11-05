import { expect, test } from "@playwright/test";

test("cocher un item le met au panier, terminer les courses vide le panier", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("checkbox", { name: "Lait", exact: true }).click();
  const panier = page.getByRole("region", { name: "Dans le panier" });
  await expect(panier.getByRole("checkbox", { name: "Lait", exact: true })).toBeChecked();

  await page.getByRole("button", { name: "Terminer les courses" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
  await expect(panier).toBeHidden();
});

test("réordonner un rayon au clavier change l'ordre de la liste", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuration" }).click();

  await page.getByRole("button", { name: "Déplacer Hygiène" }).focus();
  await page.keyboard.press("Space");
  await expect(page.getByText("Hygiène saisi, position 2 sur 8.")).toBeAttached();
  // dnd-kit announces the pick-up, then listens for arrow keys one task later: let that task run.
  await page.evaluate(() => new Promise((resolve) => setTimeout(resolve)));
  await page.keyboard.press("ArrowDown");
  await expect(page.getByText("Hygiène en position 3 sur 8.")).toBeAttached();
  await page.keyboard.press("Space");
  await page.getByRole("button", { name: "Liste" }).click();

  await expect(page.getByRole("heading", { level: 2 })).toHaveText([
    "Vêtements",
    "Épicerie",
    "Hygiène",
    "Collations",
    "Fruits et légumes",
    "Produits laitiers",
    "Non classé",
  ]);
});
