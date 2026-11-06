import AxeBuilder from "@axe-core/playwright";
import type { LienResponse } from "@ecureuil/wire";
import { expect, type Page, test } from "@playwright/test";

test("en Courses, cocher un article le met au panier, terminer les courses vide le panier", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("switch", { name: "Courses" }).click();

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
    "À valider (1)",
    "Vêtements",
    "Épicerie",
    "Hygiène",
    "Collations",
    "Fruits et légumes",
    "Produits laitiers",
    "Non classé",
  ]);
});

test("le retour du navigateur ramène de la configuration à la liste", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuration" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Configuration" })).toBeVisible();

  await page.goBack();

  await expect(page.getByRole("button", { name: "Configuration" })).toBeFocused();
});

test("après un premier chargement, l'app redémarre sans réseau", async ({ page, context }) => {
  await page.goto("/");
  await expect
    .poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null))
    .toBe(true);

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("button", { name: "Lait", exact: true })).toBeVisible();
});

/** Each screen as reached by its user: axe checks it against WCAG 2.2 AA. */
const screens: ReadonlyArray<{ name: string; reach: (page: Page) => Promise<unknown> }> = [
  { name: "la liste en Préparer", reach: () => Promise.resolve() },
  {
    name: "la liste en Courses, panier rempli",
    reach: async (page) => {
      await page.getByRole("switch", { name: "Courses" }).click();
      await page.getByRole("checkbox", { name: "Lait", exact: true }).click();
    },
  },
  {
    name: "terminer les courses",
    reach: async (page) => {
      await page.getByRole("switch", { name: "Courses" }).click();
      await page.getByRole("checkbox", { name: "Lait", exact: true }).click();
      await page.getByRole("button", { name: "Terminer les courses" }).click();
      await expect(page.getByRole("alertdialog")).toBeVisible();
    },
  },
  {
    name: "l'ajout rapide",
    reach: async (page) => {
      await page.getByRole("button", { name: "Ajouter" }).click();
      await expect(page.getByRole("region", { name: "Fréquents" })).toBeVisible();
    },
  },
  {
    name: "la fiche d'un article",
    reach: async (page) => {
      await page.getByRole("button", { name: "Lait", exact: true }).click();
      await expect(page.getByRole("dialog", { name: "Lait" })).toBeVisible();
    },
  },
  {
    name: "les rayons",
    reach: async (page) => {
      await page.getByRole("button", { name: "Configuration" }).click();
      await expect(page.getByRole("list", { name: "Rayons" })).toBeVisible();
    },
  },
  {
    name: "les articles",
    reach: async (page) => {
      await page.getByRole("button", { name: "Configuration" }).click();
      await page.getByRole("tab", { name: "Articles" }).click();
      await expect(page.getByRole("list", { name: "Articles" })).toBeVisible();
    },
  },
  {
    name: "les réglages",
    reach: async (page) => {
      await page.getByRole("button", { name: "Configuration" }).click();
      await page.getByRole("tab", { name: "Réglages" }).click();
      await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
    },
  },
];

test.describe("accessibilité", () => {
  // A row caught mid view transition would be read half transparent.
  test.use({ reducedMotion: "reduce" });

  for (const { name, reach } of screens) {
    test(`${name} respecte WCAG 2.2 AA`, async ({ page }) => {
      await page.goto("/");
      await reach(page);
      await expectNoAxeViolation(page);
    });
  }

  test("la vue de l'invité respecte WCAG 2.2 AA", async ({ page }) => {
    const inviteLien: LienResponse = { role: "invite", invite: null };
    await page.route("**/lien", (route) => route.fulfill({ json: inviteLien }));
    await page.route("**/journal**", (route) => route.abort());
    await page.goto("/");
    await page.evaluate(() => localStorage.setItem("ecureuil.lien", "secret-smoke-invite"));
    await page.reload();
    await page.getByRole("textbox", { name: "Nom" }).fill("Café");
    await page.keyboard.press("Enter");
    await expect(page.getByRole("region", { name: "Mes demandes" })).toContainText("Café");
    await expectNoAxeViolation(page);
  });
});

async function expectNoAxeViolation(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
}
