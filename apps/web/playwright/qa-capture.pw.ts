import { rm } from "node:fs/promises";
import { join } from "node:path";
import { devices, expect, type Page, test } from "@playwright/test";

const mobile = devices["Pixel 7"].viewport;

/** `QA_OUT=before` on `main`, the default `after` on the branch: two folders to compare. */
const outDir = join(import.meta.dirname, "../../../qa-output", process.env.QA_OUT || "after");

// A failed run must not leave an older capture to be attached as this one.
test.beforeAll(() => rm(outDir, { recursive: true, force: true }));

test.describe("captures", () => {
  // Rows move with a view transition: a still frame mid-move would differ from run to run.
  test.use({ reducedMotion: "reduce" });

  test("listes Costco et Maxi", async ({ page }) => {
    await page.goto("/");
    await screenshot(page, "costco");

    await page.getByRole("tab", { name: "Maxi" }).click();
    await expect(page.getByRole("tab", { name: "Maxi" })).toHaveAttribute("aria-selected", "true");
    await screenshot(page, "maxi");
  });

  test("panier et terminer les courses", async ({ page }) => {
    await page.goto("/");
    await checkLaitAndBabybel(page);
    await screenshot(page, "panier");

    await page.getByRole("button", { name: "Terminer les courses" }).click();
    await expect(page.getByRole("alertdialog")).toBeVisible();
    await screenshot(page, "terminer", { fullPage: false });
  });

  test("réglages d'un appareil sans lien", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Réglages" }).click();
    await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
    await screenshot(page, "reglages");
  });
});

test("vidéo : cocher puis terminer les courses", async ({ page }) => {
  await page.goto("/");
  await pause(page);
  await checkLaitAndBabybel(page);

  await page.getByRole("button", { name: "Terminer les courses" }).click();
  await pause(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByRole("region", { name: "Dans le panier" })).toBeHidden();
  await pause(page);

  // The video is only written once the page closes.
  await page.close();
  await page.video()?.saveAs(join(outDir, "courses.webm"));
});

async function checkLaitAndBabybel(page: Page) {
  const panier = page.getByRole("region", { name: "Dans le panier" });
  for (const name of ["Lait", "Babybel"]) {
    await page.getByRole("checkbox", { name, exact: true }).click();
    await expect(panier.getByRole("checkbox", { name, exact: true })).toBeChecked();
    await panier.scrollIntoViewIfNeeded();
    await pause(page);
  }
}

/**
 * A full-page shot grows the viewport to the page instead of stitching it: the fixed footer then
 * sits below the list, not over it.
 */
async function screenshot(page: Page, name: string, { fullPage = true } = {}) {
  if (fullPage) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ ...mobile, height: Math.max(height, mobile.height) });
  }
  await page.screenshot({ path: join(outDir, `${name}.png`), animations: "disabled" });
  await page.setViewportSize(mobile);
}

/** Leaves the viewer of the video time to see each step. Stills wait on the UI state, not on it. */
function pause(page: Page) {
  return page.waitForTimeout(800);
}
