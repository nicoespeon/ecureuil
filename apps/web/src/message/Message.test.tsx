import { act, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderApp } from "../config/renderApp";

describe("le message après une action", () => {
  it("s'efface seul après 2,5 secondes", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    await addPommes();

    await act(() => vi.advanceTimersByTimeAsync(2500));

    expect(screen.queryByText("Sur la liste : Pommes")).toBeNull();
  });

  it("reste affiché pendant qu'on cherche l'article suivant", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const { user } = await addPommes();

    await user.type(screen.getByRole("searchbox", { name: "Article à ajouter" }), "lai");
    await act(() => vi.advanceTimersByTimeAsync(600));

    expect(screen.getByText("Sur la liste : Pommes")).toBeVisible();
  });

  it("un tap le ferme sans fermer le panneau", async () => {
    const { user } = await addPommes();

    await user.click(screen.getByText("Sur la liste : Pommes"));

    expect(screen.queryByText("Sur la liste : Pommes")).toBeNull();
    expect(screen.getByRole("dialog", { name: "Ajouter à la liste" })).toBeVisible();
  });
});

async function addPommes() {
  const rendered = renderApp();
  const { user } = rendered;
  await user.click(screen.getByRole("button", { name: "Ajouter" }));
  await user.type(screen.getByRole("searchbox", { name: "Article à ajouter" }), "pom");
  await user.click(screen.getByRole("button", { name: "Pommes" }));
  return rendered;
}
