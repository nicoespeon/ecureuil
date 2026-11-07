import { join } from "node:path";
import { devices, type Page } from "@playwright/test";

/** `QA_OUT=before` on `main`, the default `after` on the branch: two folders to compare. */
export const outDir = join(
  import.meta.dirname,
  "../../../qa-output",
  process.env.QA_OUT || "after",
);

export async function saveVideo(page: Page, name: string) {
  await pause(page);
  // The video is only written once the page closes.
  await page.close();
  await page.video()?.saveAs(join(outDir, `${name}.webm`));
}

/**
 * A full-page shot grows the viewport to the page instead of stitching it: the fixed footer then
 * sits below the list, not over it.
 */
export async function screenshot(page: Page, name: string, { fullPage = true } = {}) {
  const viewport = page.viewportSize() ?? devices["Pixel 7"].viewport;
  if (fullPage) {
    const height = await page.evaluate(() => document.documentElement.scrollHeight);
    await page.setViewportSize({ ...viewport, height: Math.max(height, viewport.height) });
  }
  await page.screenshot({ path: join(outDir, `${name}.png`), animations: "disabled" });
  await page.setViewportSize(viewport);
}

/** Leaves the viewer of the video time to see each step. Stills wait on the UI state, not on it. */
export function pause(page: Page) {
  return page.waitForTimeout(800);
}
