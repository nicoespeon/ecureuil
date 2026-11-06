import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { Actor, LienResponse } from "@ecureuil/wire";
import { devices, expect, type Page, test } from "@playwright/test";

const narrowPhone = { width: 375, height: 812 };
const desktop = { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false };

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
    await page.getByRole("button", { name: "Configuration" }).click();
    await page.getByRole("tab", { name: "Réglages" }).click();
    await expect(page.getByRole("heading", { name: "Réglages" })).toBeVisible();
    await screenshot(page, "reglages");
  });
});

test.describe("captures de la configuration à 375 px", () => {
  test.use({ reducedMotion: "reduce", viewport: narrowPhone });

  test("rayons, items et fiche", async ({ page }) => {
    await captureConfiguration(page, "375");
  });

  test("nouveau magasin, puis plus aucun magasin", async ({ page }) => {
    await openRayons(page);
    await openNouveauMagasin(page);
    await page.getByRole("textbox", { name: "Nom" }).fill("IGA");
    await screenshot(page, "nouveau-magasin-fenetre-375", { fullPage: false });
    await page.getByRole("button", { name: "Créer" }).click();
    await expect(page.getByRole("tab", { name: "IGA" })).toHaveAttribute("aria-selected", "true");
    await screenshot(page, "nouveau-magasin-375");

    await page.getByRole("button", { name: "Supprimer IGA" }).click();
    await screenshot(page, "supprimer-magasin-375", { fullPage: false });
    await page.getByRole("button", { name: "Confirmer la suppression de IGA" }).click();
    for (const name of ["Costco", "Maxi"]) await removeMagasin(page, name);
    await expect(page.getByRole("button", { name: "Créer un magasin" })).toBeVisible();
    await screenshot(page, "sans-magasin-375");
  });
});

test.describe("vidéo des magasins à 375 px", () => {
  test.use({ viewport: narrowPhone });

  test("vidéo : créer un magasin, le renommer, le supprimer", async ({ page }) => {
    await openRayons(page);
    await openNouveauMagasin(page);
    await page.getByRole("textbox", { name: "Nom" }).pressSequentially("IGA", { delay: 200 });
    await pause(page);
    await page.keyboard.press("Enter");
    const nom = page.getByRole("textbox", { name: "Nom du magasin" });
    await expect(nom).toBeFocused();
    await pause(page);
    await nom.fill("");
    await nom.pressSequentially("IGA Extra", { delay: 200 });
    await page.keyboard.press("Enter");
    await expect(page.getByRole("tab", { name: "IGA Extra" })).toBeVisible();
    await pause(page);
    await page.getByRole("button", { name: "Supprimer IGA Extra" }).click();
    await pause(page);
    await page.getByRole("button", { name: "Confirmer la suppression de IGA Extra" }).click();
    await expect(page.getByRole("tab", { name: "IGA Extra" })).toBeHidden();
    await saveVideo(page, "magasins");
  });
});

test.describe("vidéo de l'ajout rapide à 375 px", () => {
  test.use({ viewport: narrowPhone });

  test("vidéo : remettre un fréquent, trouver un item, en créer un", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await pause(page);
    await page
      .getByRole("region", { name: "Fréquents" })
      .getByRole("button", { name: "Bananes" })
      .click();
    await pause(page);
    await searchbox(page).pressSequentially("pom", { delay: 200 });
    await pause(page);
    await page.getByRole("button", { name: "Pommes" }).click();
    await pause(page);
    await searchbox(page).pressSequentially("Laitue", { delay: 200 });
    await pause(page);
    await page.getByRole("button", { name: "Créer « Laitue »" }).click();
    const fiche = page.getByRole("dialog", { name: "Laitue" });
    await expect(fiche).toBeVisible();
    await pause(page);
    await fiche
      .getByRole("combobox", { name: "Rayon chez Costco" })
      .selectOption({ label: "Fruits et légumes" });
    await pause(page);
    await fiche.getByRole("button", { name: "Fermer" }).click();
    await expect(searchbox(page)).toBeFocused();
    await pause(page);
    await page
      .getByRole("dialog", { name: "Ajouter à la liste" })
      .getByRole("button", { name: "Fermer" })
      .click();
    const laitue = page
      .getByRole("region", { name: "Fruits et légumes" })
      .getByRole("checkbox", { name: "Laitue" });
    await laitue.scrollIntoViewIfNeeded();
    await expect(laitue).toBeVisible();
    await saveVideo(page, "ajout");
  });
});

test.describe("captures sur desktop", () => {
  test.use({ reducedMotion: "reduce", ...desktop });

  test("liste, rayons, items et fiche", async ({ page }) => {
    await page.goto("/");
    await screenshot(page, "liste-desktop");
    await captureConfiguration(page, "desktop");
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

test("vidéo : réordonner un rayon au clavier", async ({ page }) => {
  await openRayons(page);
  await page.getByRole("button", { name: "Déplacer Hygiène" }).focus();
  await pause(page);
  await page.keyboard.press("Space");
  await expect(page.getByText("Hygiène saisi, position 2 sur 8.")).toBeAttached();
  await pause(page);
  for (const position of [3, 4]) {
    await page.keyboard.press("ArrowDown");
    await expect(page.getByText(`Hygiène en position ${position} sur 8.`)).toBeAttached();
    await pause(page);
  }
  await page.keyboard.press("Space");
  await expectHygieneMovedDown(page);
  await saveVideo(page, "rayons-clavier");
});

test("vidéo : réordonner un rayon à la souris", async ({ page }) => {
  await openRayons(page);
  const { from, to } = await dragPath(page);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 30 });
  await pause(page);
  await page.mouse.up();
  await expectHygieneMovedDown(page);
  await saveVideo(page, "rayons-souris");
});

test("vidéo : réordonner un rayon au doigt", async ({ page }) => {
  await openRayons(page);
  const { from, to } = await dragPath(page);
  // Playwright only taps: a drag needs the touch events of the Chrome DevTools Protocol.
  const cdp = await page.context().newCDPSession(page);
  const touch = (type: "touchStart" | "touchMove" | "touchEnd", point?: { x: number; y: number }) =>
    cdp.send("Input.dispatchTouchEvent", { type, touchPoints: point ? [point] : [] });
  await touch("touchStart", from);
  for (let step = 1; step <= 30; step++) {
    await touch("touchMove", { x: from.x, y: from.y + ((to.y - from.y) * step) / 30 });
    await page.waitForTimeout(16);
  }
  await pause(page);
  await touch("touchEnd");
  await expectHygieneMovedDown(page);
  await saveVideo(page, "rayons-doigt");
});

test.describe("captures des demandes à 375 px", () => {
  test.use({ reducedMotion: "reduce", viewport: narrowPhone, serviceWorkers: "block" });

  test("invité, puis « À valider », puis le verdict vu par l'invité", async ({ page }) => {
    await walkDemandes(page, (name) => screenshot(page, name));
  });
});

test.describe("vidéo des demandes", () => {
  test.use({ serviceWorkers: "block" });

  test("vidéo : demander, accepter et refuser", async ({ page }) => {
    await walkDemandes(page, () => pause(page));
    await saveVideo(page, "demandes");
  });
});

/**
 * The invite asks for two things, the proprietaire accepts one and refuses the other, then the
 * invite withdraws the last one waiting.
 */
async function walkDemandes(page: Page, capture: (name: string) => Promise<unknown>) {
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
  await expect(page.getByRole("status")).toHaveText("Déjà sur la liste");
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
  await expect(page.getByRole("tab", { name: "Costco" })).toBeVisible();
}

async function captureConfiguration(page: Page, suffix: string) {
  await openRayons(page);
  await screenshot(page, `rayons-${suffix}`);

  await page.getByRole("tab", { name: "Items" }).click();
  await expect(page.getByRole("list", { name: "Items" })).toBeVisible();
  await screenshot(page, `items-${suffix}`);

  await page.getByRole("button", { name: "Lait", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Lait" })).toBeVisible();
  await screenshot(page, `fiche-${suffix}`, { fullPage: false });
}

async function openRayons(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Configuration" }).click();
  await expect(page.getByRole("list", { name: "Rayons" })).toBeVisible();
  await pause(page);
}

async function openNouveauMagasin(page: Page) {
  await page.getByRole("button", { name: "Nouveau magasin" }).click();
  await expect(page.getByRole("dialog", { name: "Nouveau magasin" })).toBeVisible();
  await pause(page);
}

async function removeMagasin(page: Page, name: string) {
  await page.getByRole("button", { name: `Supprimer ${name}` }).click();
  await page.getByRole("button", { name: `Confirmer la suppression de ${name}` }).click();
}

/** From the handle of Hygiène to two rows below. */
async function dragPath(page: Page) {
  const handle = await page.getByRole("button", { name: "Déplacer Hygiène" }).boundingBox();
  const row = await page.getByRole("button", { name: "Déplacer Épicerie" }).boundingBox();
  if (!handle || !row) throw new Error("The rayon handles are not on screen");
  const from = { x: handle.x + handle.width / 2, y: handle.y + handle.height / 2 };
  return { from, to: { x: from.x, y: from.y + 2 * (row.y - handle.y) } };
}

async function expectHygieneMovedDown(page: Page) {
  const names = page
    .getByRole("list", { name: "Rayons" })
    .getByRole("textbox")
    .evaluateAll((fields) =>
      fields.map((field) => (field instanceof HTMLInputElement ? field.value : "")),
    );
  expect((await names).slice(0, 4)).toEqual(["Vêtements", "Épicerie", "Collations", "Hygiène"]);
}

async function saveVideo(page: Page, name: string) {
  await pause(page);
  // The video is only written once the page closes.
  await page.close();
  await page.video()?.saveAs(join(outDir, `${name}.webm`));
}

function searchbox(page: Page) {
  return page.getByRole("searchbox", { name: "Item à ajouter" });
}

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
  const viewport = page.viewportSize() ?? devices["Pixel 7"].viewport;
  if (fullPage) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ ...viewport, height: Math.max(height, viewport.height) });
  }
  await page.screenshot({ path: join(outDir, `${name}.png`), animations: "disabled" });
  await page.setViewportSize(viewport);
}

/** Leaves the viewer of the video time to see each step. Stills wait on the UI state, not on it. */
function pause(page: Page) {
  return page.waitForTimeout(800);
}
