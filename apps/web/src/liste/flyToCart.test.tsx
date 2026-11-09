import { screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../config/renderApp";

describe("la case cochée s'envole vers le chariot", () => {
  it("cocher Lait fait partir une animation", async () => {
    const { user } = renderApp();
    await startCourses(user);

    const startedByClick = await animationsStartedBy(() =>
      user.click(screen.getByRole("checkbox", { name: "Lait" })),
    );

    expect(startedByClick).not.toEqual([]);
  });

  it("pendant le vol, Lait est déjà dans le panier, visible", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(panierBox("Lait")).toBeVisible();
  });

  it("on coche Babybel pendant le vol de Lait", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(screen.getByRole("checkbox", { name: "Babybel" }));

    expect(panierBox("Babybel")).toBeChecked();
  });

  it("pour qui demande moins de mouvement, rien ne vole", async () => {
    vi.stubGlobal("matchMedia", reducedMotion);
    const { user } = renderApp();
    await startCourses(user);

    const startedByClick = await animationsStartedBy(() =>
      user.click(screen.getByRole("checkbox", { name: "Lait" })),
    );

    expect(startedByClick).toEqual([]);
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}

function panierBox(name: string) {
  return within(screen.getByRole("region", { name: "Dans le panier" })).getByRole("checkbox", {
    name,
  });
}

/** The Web Animations a gesture starts, apart from those of an earlier test still playing. */
async function animationsStartedBy(gesture: () => Promise<void>) {
  const before = runningAnimations();
  await gesture();
  return runningAnimations().filter((animation) => !before.includes(animation));
}

function runningAnimations() {
  return [...document.querySelectorAll("*")].flatMap((element) => element.getAnimations());
}

/** A device set to reduce motion, as `matchMedia` answers it. */
function reducedMotion(query: string) {
  return {
    matches: query === "(prefers-reduced-motion: reduce)",
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
