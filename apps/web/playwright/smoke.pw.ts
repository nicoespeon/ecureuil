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
