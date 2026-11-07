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

test("descendre un rayon au bouton garde le focus pour descendre encore", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuration" }).click();

  await page.getByRole("button", { name: "Descendre Hygiène" }).click();

  await expect(page.getByRole("button", { name: "Descendre Hygiène" })).toBeFocused();
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
    name: "tout dans le panier",
    reach: async (page) => {
      await page.getByRole("switch", { name: "Courses" }).click();
      await checkEverythingToBuy(page);
      await expect(page.getByText("Tout est dans le panier !", { exact: true })).toBeVisible();
    },
  },
  {
    name: "les courses terminées",
    reach: async (page) => {
      await page.getByRole("switch", { name: "Courses" }).click();
      await page.getByRole("checkbox", { name: "Lait", exact: true }).click();
      await page.getByRole("button", { name: "Terminer les courses" }).click();
      await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
      await expect(page.getByText("Courses terminées", { exact: true })).toBeVisible();
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

test.describe("les fêtes et les micro-victoires", () => {
  test.use({ reducedMotion: "no-preference" });

  test("cocher un article fait sauter sa case", async ({ page }) => {
    const animations = await recordAnimations(page);
    await page.goto("/");
    await page.getByRole("switch", { name: "Courses" }).click();

    await page.getByRole("checkbox", { name: "Lait", exact: true }).click();

    await expect.poll(animations).toContain("pop");
  });

  test("un article ajouté se surligne dans la liste", async ({ page }) => {
    const animations = await recordAnimations(page);
    await page.goto("/");
    await page.getByRole("button", { name: "Ajouter" }).click();

    await page.getByRole("searchbox", { name: "Article à ajouter" }).fill("pom");
    await page.getByRole("button", { name: "Pommes" }).click();

    await expect.poll(animations).toContain("arrive");
  });

  test("l'écureuil bondit quand tout est dans le panier, sur l'écran à jour", async ({ page }) => {
    const animations = await recordAnimations(page);
    await page.goto("/");
    await page.getByRole("switch", { name: "Courses" }).click();

    await checkEverythingToBuy(page);

    await expect(page.getByText("Tout est dans le panier !", { exact: true })).toBeVisible();
    await expect.poll(animations).toContain("hop");
    // Neither the boxes' pops nor the hop may play hidden under a transition.
    expect(await animations()).not.toContain("under-view-transition");
  });
});

test("aucun titre de rayon ne recouvre l'ombre de ce qui est posé au-dessus", async ({ page }) => {
  // A box mid-pop would carry its shadow elsewhere.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/");
  await page.getByRole("switch", { name: "Courses" }).click();

  await checkEverythingToBuy(page);
  await expect(page.getByText("Tout est dans le panier !", { exact: true })).toBeVisible();
  // Checking scrolled the page: the squirrel's banner, at the top, must be in view to be hit.
  await page.evaluate(() => window.scrollTo(0, 0));

  expect(await shadowsCoveredByHeadings(page)).toEqual([]);
});

/** What casts a matte shadow downward, named by its text, when an h2 paints over that shadow. */
function shadowsCoveredByHeadings(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLElement>("main *")].flatMap((element) => {
      const [outer = ""] = getComputedStyle(element).boxShadow.split(/,(?![^(]*\))/);
      const offsetY = /(-?[\d.]+)px\s+(-?[\d.]+)px/.exec(outer)?.[2];
      if (outer.includes("inset") || !offsetY || Number(offsetY) <= 0) return [];
      const box = element.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.bottom + 1);
      return hit?.closest("h2") ? [element.textContent?.trim().slice(0, 30)] : [];
    }),
  );
}

test("sous reduced-motion, ni la case ni l'écureuil ne bougent", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const animations = await recordAnimations(page);
  await page.goto("/");
  await page.getByRole("switch", { name: "Courses" }).click();

  await checkEverythingToBuy(page);

  await expect(page.getByText("Tout est dans le panier !", { exact: true })).toBeVisible();
  expect(await animations()).not.toMatch(/\b(pop|hop)\b/);
});

test.describe("accessibilité", () => {
  // A still screen: no box mid-pop, no squirrel mid-hop.
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

/** The names of the CSS animations that start from now on, read after the fact: some last 150 ms. */
async function recordAnimations(page: Page) {
  await page.addInitScript(() => {
    document.addEventListener("animationstart", (event) => {
      // The browser's own view transition animations are noise here.
      if (event.animationName.startsWith("-ua-")) return;
      // The old screen's snapshot hides whatever starts under it.
      const underViewTransition = document
        .getAnimations()
        .some(
          ({ effect }) =>
            effect instanceof KeyframeEffect &&
            effect.pseudoElement?.startsWith("::view-transition"),
        );
      const name = underViewTransition
        ? `${event.animationName}-under-view-transition`
        : event.animationName;
      const seen = document.documentElement.dataset.animations ?? "";
      document.documentElement.dataset.animations = `${seen} ${name}`;
    });
  });
  return async () => (await page.locator("html").getAttribute("data-animations")) ?? "";
}

/** Checked by name: each check moves its row, which a positional locator would chase. */
async function checkEverythingToBuy(page: Page) {
  const names = await page
    .getByRole("checkbox", { checked: false })
    .evaluateAll((boxes) => boxes.map((box) => box.getAttribute("aria-label") ?? ""));
  const panier = page.getByRole("region", { name: "Dans le panier" });
  for (const name of names) {
    await page.getByRole("checkbox", { name, exact: true }).click();
    await expect(panier.getByRole("checkbox", { name, exact: true })).toBeChecked();
  }
}

async function expectNoAxeViolation(page: Page) {
  const { violations } = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  expect(
    violations.map(({ id, help, nodes }) => ({ id, help, targets: nodes.map((n) => n.target) })),
  ).toEqual([]);
}
