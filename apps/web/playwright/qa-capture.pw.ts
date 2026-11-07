import { rm } from "node:fs/promises";
import type { Actor, LienResponse } from "@ecureuil/wire";
import { expect, type Page, test } from "@playwright/test";
import { outDir, pause, saveVideo, screenshot } from "./qaCapture";

const narrowPhone = { width: 375, height: 812 };
const desktop = { viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false };

// A failed run must not leave an older capture to be attached as this one.
test.beforeAll(() => rm(outDir, { recursive: true, force: true }));

test.describe("captures", () => {
  // A box mid-pop or a squirrel mid-hop would differ from run to run.
  test.use({ reducedMotion: "reduce" });

  test("listes Costco et Maxi", async ({ page }) => {
    await page.goto("/");
    await screenshot(page, "costco");

    await page.getByRole("tab", { name: "Maxi" }).click();
    await expect(page.getByRole("tab", { name: "Maxi" })).toHaveAttribute("aria-selected", "true");
    await screenshot(page, "maxi");

    await startCourses(page);
    await screenshot(page, "maxi-courses");
  });

  test("panier et terminer les courses", async ({ page }) => {
    await page.goto("/");
    await startCourses(page);
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

  test("rayons, articles et fiche", async ({ page }) => {
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

test.describe("créer un article depuis la configuration à 375 px", () => {
  test.use({ viewport: narrowPhone });

  test("vidéo : chercher, créer, classer l'article", async ({ page }) => {
    await openRayons(page);
    await page.getByRole("tab", { name: "Articles" }).click();
    const search = page.getByRole("searchbox", { name: "Rechercher ou créer un article" });
    await search.pressSequentially("Lai", { delay: 200 });
    await expect(page.getByRole("button", { name: "Créer « Lai »" })).toBeVisible();
    await screenshot(page, "articles-creer-375", { fullPage: false });
    await search.pressSequentially("tue", { delay: 200 });
    await page.getByRole("button", { name: "Créer « Laitue »" }).click();
    const fiche = page.getByRole("dialog", { name: "Laitue" });
    await expect(fiche).toBeVisible();
    await screenshot(page, "articles-creer-fiche-375", { fullPage: false });
    await fiche.getByRole("combobox", { name: "Rayon chez Costco" }).selectOption({ index: 1 });
    await pause(page);
    await fiche.getByRole("button", { name: "Fermer" }).click();
    await expect(page.getByRole("button", { name: "Laitue", exact: true })).toBeFocused();
    await saveVideo(page, "articles-creer");
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

test.describe("captures de la liste et de l'ajout rapide à 375 px", () => {
  test.use({ reducedMotion: "reduce", viewport: narrowPhone });

  test("liste, panier, fréquents et recherche", async ({ page }) => {
    await page.goto("/");
    await screenshot(page, "liste-375");
    await startCourses(page);
    await screenshot(page, "liste-courses-375");
    await checkLaitAndBabybel(page);
    await screenshot(page, "panier-375", { fullPage: false });

    await page.getByRole("switch", { name: "Courses" }).click();
    await expect(page.getByRole("switch", { name: "Courses" })).not.toBeChecked();
    await page.getByRole("region", { name: "Dans le panier" }).scrollIntoViewIfNeeded();
    await screenshot(page, "panier-preparer-375", { fullPage: false });

    await page.getByRole("button", { name: "Ajouter" }).click();
    await expect(page.getByRole("region", { name: "Fréquents" })).toBeVisible();
    await screenshot(page, "ajout-frequents", { fullPage: false });

    await searchbox(page).fill("lai");
    await expect(page.getByRole("button", { name: "Créer « lai »" })).toBeVisible();
    await screenshot(page, "ajout-recherche", { fullPage: false });

    await page.getByRole("button", { name: "Créer « lai »" }).click();
    await expect(page.getByRole("dialog", { name: "lai" })).toBeVisible();
    await screenshot(page, "ajout-fiche", { fullPage: false });
  });
});

test.describe("vidéo de l'ajout rapide à 375 px", () => {
  test.use({ viewport: narrowPhone });

  test("vidéo : remettre un fréquent, trouver un article, en créer un", async ({ page }) => {
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
      .getByRole("button", { name: "Laitue", exact: true });
    await laitue.scrollIntoViewIfNeeded();
    await expect(laitue).toBeVisible();
    await saveVideo(page, "ajout");
  });
});

test.describe("captures des fêtes à 375 px", () => {
  test.use({ reducedMotion: "reduce", viewport: narrowPhone });

  test("tout dans le panier, courses terminées, liste vide", async ({ page }) => {
    await page.goto("/");
    await startCourses(page);
    await checkEverythingToBuy(page);
    await screenshot(page, "tout-dans-le-panier-375", { fullPage: false });

    await page.getByRole("button", { name: "Terminer les courses" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
    await expect(page.getByRole("region", { name: "Dans le panier" })).toBeHidden();
    await screenshot(page, "courses-terminees-375", { fullPage: false });

    // Absent on main: the before has no message to close.
    const fermer = page.getByRole("button", { name: "Fermer le message" });
    if (await fermer.isVisible()) await fermer.click();
    await removeEverythingToBuy(page);
    await screenshot(page, "liste-vide-375", { fullPage: false });
  });
});

test.describe("compteur à 375 px", () => {
  test.use({ reducedMotion: "reduce", viewport: narrowPhone });

  test("un grand compte à côté de « Terminer les courses »", async ({ page }) => {
    await page.goto("/");
    // The seed plans 12 and a quantity stops at 10: 37 more taps make 49.
    const added = { Lait: 7, Babybel: 9, Nutella: 9, Yaourts: 9, Champignons: 3 };
    for (const [name, taps] of Object.entries(added)) {
      const plus = page.getByRole("button", { name: `Augmenter la quantité de ${name}` });
      for (let tap = 0; tap < taps; tap += 1) await plus.click();
    }
    await expect(page.getByText("49 articles")).toBeVisible();
    await startCourses(page);
    await checkEverythingToBuy(page);
    await screenshot(page, "compteur-49-375", { fullPage: false });
  });
});

test.describe("vidéo des fêtes à 375 px", () => {
  test.use({ viewport: narrowPhone });

  test("vidéo : ajouter, tout cocher, terminer les courses", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Ajouter" }).click();
    await searchbox(page).pressSequentially("pom", { delay: 200 });
    await page.getByRole("button", { name: "Pommes" }).click();
    await page.getByRole("button", { name: "Fermer" }).click();
    await pause(page);
    await startCourses(page);
    await pause(page);
    await checkEverythingToBuy(page);
    await pause(page);
    await page.getByRole("button", { name: "Terminer les courses" }).click();
    await pause(page);
    await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
    await saveVideo(page, "fetes");
  });
});

test.describe("captures sur desktop", () => {
  test.use({ reducedMotion: "reduce", ...desktop });

  test("liste, rayons, articles et fiche", async ({ page }) => {
    await page.goto("/");
    await screenshot(page, "liste-desktop");
    await captureConfiguration(page, "desktop");
  });
});

test("vidéo : passer en Courses, cocher, décocher, terminer les courses", async ({ page }) => {
  await page.goto("/");
  await pause(page);
  await startCourses(page);
  await pause(page);
  await checkLaitAndBabybel(page);
  await page.getByRole("checkbox", { name: "Lait", exact: true }).uncheck();
  await pause(page);

  await page.getByRole("button", { name: "Terminer les courses" }).click();
  await pause(page);
  await page.getByRole("alertdialog").getByRole("button", { name: "Terminer" }).click();
  await expect(page.getByRole("region", { name: "Dans le panier" })).toBeHidden();
  await expect(page.getByRole("switch", { name: "Courses" })).not.toBeChecked();
  await saveVideo(page, "courses");
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

test("vidéo : monter et descendre un rayon au bouton", async ({ page }) => {
  await openRayons(page);
  await page.getByRole("button", { name: "Descendre Hygiène" }).click();
  await expect(page.getByText("Hygiène en position 3 sur 8.")).toBeAttached();
  await pause(page);
  await page.getByRole("button", { name: "Descendre Hygiène" }).click();
  await expect(page.getByText("Hygiène en position 4 sur 8.")).toBeAttached();
  await expectHygieneMovedDown(page);
  await saveVideo(page, "rayons-boutons");
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

  await page.getByRole("tab", { name: "Articles" }).click();
  await expect(page.getByRole("list", { name: "Articles" })).toBeVisible();
  await screenshot(page, `articles-${suffix}`);

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

function searchbox(page: Page) {
  return page.getByRole("searchbox", { name: "Article à ajouter" });
}

async function startCourses(page: Page) {
  await page.getByRole("switch", { name: "Courses" }).click();
  await expect(page.getByRole("checkbox", { name: "Lait", exact: true })).toBeVisible();
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

/** Checked by name, then scrolled back up: each check moves its row to the panier. */
async function checkEverythingToBuy(page: Page) {
  const names = await page
    .getByRole("checkbox", { checked: false })
    .evaluateAll((boxes) => boxes.map((box) => box.getAttribute("aria-label") ?? ""));
  const panier = page.getByRole("region", { name: "Dans le panier" });
  for (const name of names) {
    await page.getByRole("checkbox", { name, exact: true }).click();
    await expect(panier.getByRole("checkbox", { name, exact: true })).toBeChecked();
  }
  await page.evaluate(() => window.scrollTo(0, 0));
}

/** Two taps on each trash, the second one confirming. */
async function removeEverythingToBuy(page: Page) {
  const trash = page.getByRole("button", { name: /^Retirer .+ de la liste$/ }).first();
  while (await trash.isVisible()) {
    await trash.click();
    await page.getByRole("button", { name: /^Retirer .+ \?$/ }).click();
  }
}
