import { cleanup, screen, within } from "@testing-library/react";
import type userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../config/renderApp";

describe("préparer ou faire les courses", () => {
  it("s'ouvre en Préparer, l'interrupteur « Courses » éteint", () => {
    renderApp();

    expect(screen.getByRole("switch", { name: "Courses" })).not.toBeChecked();
  });

  it("en Préparer, aucune case à cocher", () => {
    renderApp();

    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("en Préparer, Lait n'affiche pas « ×3 » à côté de son stepper", () => {
    renderApp();

    expect(row("Lait")).not.toHaveTextContent("×");
  });

  it("allumer « Courses » donne une case à Lait", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(screen.getByRole("checkbox", { name: "Lait" })).not.toBeChecked();
  });

  it("en Courses, Lait affiche « ×3 »", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(row("Lait")).toHaveTextContent("Lait×3");
  });

  it("en Courses, ni stepper ni poubelle", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(screen.queryAllByRole("group", { name: /Quantité/ })).toEqual([]);
    expect(screen.queryAllByRole("button", { name: /Retirer .* de la liste/ })).toEqual([]);
  });

  it("en Courses, pas de bouton « Ajouter »", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(screen.queryByRole("button", { name: "Ajouter" })).toBeNull();
  });

  it("en Courses, « À valider » reste en tête", async () => {
    const { user } = renderApp();

    await startCourses(user);

    expect(sectionTitles()[0]).toBe("À valider (1)");
  });

  it("revenu en Préparer, le panier se lit sans case à cocher", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(screen.getByRole("switch", { name: "Courses" }));

    expect(section("Dans le panier").getByRole("listitem")).toHaveTextContent("Lait×3");
    expect(screen.queryAllByRole("checkbox")).toEqual([]);
  });

  it("en Préparer, pas de « Terminer les courses » même avec un panier", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await user.click(screen.getByRole("checkbox", { name: "Lait" }));

    await user.click(screen.getByRole("switch", { name: "Courses" }));

    expect(screen.queryByRole("button", { name: "Terminer les courses" })).toBeNull();
  });

  it("« Terminer les courses » ramène en Préparer", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);

    await finishSortie(user);

    expect(screen.getByRole("switch", { name: "Courses" })).not.toBeChecked();
  });

  it("garde le mode Courses après un remontage", async () => {
    const { user } = renderApp();
    await startCourses(user);

    cleanup();
    renderApp();

    expect(screen.getByRole("switch", { name: "Courses" })).toBeChecked();
  });

  it("passe en Courses quand le stockage de l'appareil est bloqué", async () => {
    vi.stubGlobal("localStorage", blockedStorage());
    const { user } = renderApp();

    await startCourses(user);

    expect(screen.getByRole("switch", { name: "Courses" })).toBeChecked();
  });

  it("garde le mode Courses au retour de la configuration, même quand le stockage est bloqué", async () => {
    vi.stubGlobal("localStorage", blockedStorage());
    const { user } = renderApp();
    await startCourses(user);

    await user.click(screen.getByRole("button", { name: "Configuration" }));
    await user.click(screen.getByRole("button", { name: "Liste" }));

    expect(screen.getByRole("switch", { name: "Courses" })).toBeChecked();
  });

  it("l'invité n'a pas d'interrupteur", () => {
    renderApp({ role: "invite" });

    expect(screen.queryByRole("switch")).toBeNull();
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}

async function checkLaitAndBabybel(user: User) {
  await user.click(screen.getByRole("checkbox", { name: "Lait" }));
  await user.click(screen.getByRole("checkbox", { name: "Babybel" }));
}

async function finishSortie(user: User) {
  await user.click(screen.getByRole("button", { name: "Terminer les courses" }));
  await user.click(screen.getByRole("button", { name: "Terminer" }));
}

function sectionTitles() {
  return screen.getAllByRole("heading", { level: 2 }).map((heading) => heading.textContent);
}

function section(name: string) {
  return within(screen.getByRole("region", { name }));
}

function row(itemName: string) {
  return screen.getByRole("button", { name: itemName }).closest("li");
}

/** What a browser hands out when site storage is disabled: every access throws. */
function blockedStorage() {
  const blocked = () => {
    throw new DOMException("Storage blocked", "SecurityError");
  };
  return { getItem: blocked, setItem: blocked, removeItem: blocked, clear: blocked };
}
