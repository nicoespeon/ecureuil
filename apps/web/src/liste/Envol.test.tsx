import { screen, waitFor, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../config/renderApp";

describe("la case cochée s'envole vers le panier", () => {
  it("pendant le vol, Lait est déjà au panier pour les lecteurs d'écran, pas encore à l'écran", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(panierBox("Lait")).not.toBeVisible();
  });

  it("à l'atterrissage, Lait apparaît dans le panier", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await waitFor(() => expect(panierBox("Lait")).toBeVisible(), { timeout: 2000 });
  });

  it("on coche Babybel pendant le vol de Lait", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(screen.getByRole("checkbox", { name: "Babybel" }));

    expect(panierBox("Babybel")).toBeChecked();
  });

  it("pour qui demande moins de mouvement, rien ne vole : Lait est tout de suite dans le panier", async () => {
    vi.stubGlobal("matchMedia", reducedMotion);
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    expect(panierBox("Lait")).toBeVisible();
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

/** A device set to reduce motion, as `matchMedia` answers it. */
function reducedMotion(query: string) {
  return {
    matches: query === "(prefers-reduced-motion: reduce)",
    addEventListener: () => {},
    removeEventListener: () => {},
  };
}
