import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderApp, statusTexts } from "../config/renderApp";

describe("les moments de fête", () => {
  it("en Courses, cocher le dernier article à acheter affiche « Tout est dans le panier »", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await checkEverythingToBuy(user);

    expect(screen.getByText("Tout est dans le panier !")).toBeVisible();
  });

  it("tant qu'il reste un article à acheter, rien n'est fêté", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await checkLaitAndBabybel(user);

    expect(screen.queryByText("Tout est dans le panier !")).toBeNull();
  });

  it.each([
    [["Lait"], "1 article rangé"],
    [["Lait", "Babybel"], "2 articles rangés"],
  ])("terminer les courses avec %j dit « %s »", async (names, putAway) => {
    const { user } = renderApp();
    await startCourses(user);
    for (const name of names) await user.click(screen.getByRole("checkbox", { name }));

    await finishSortie(user);

    expect(screen.getByText("Courses terminées")).toBeVisible();
    expect(screen.getByText(putAway)).toBeVisible();
  });

  it("« Fermer » range le message de fin des courses", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);
    await finishSortie(user);

    await user.click(screen.getByRole("button", { name: "Fermer le message" }));

    expect(screen.queryByText("Courses terminées")).toBeNull();
  });

  it("« Fermer le message » rend le focus à la liste", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);
    await finishSortie(user);

    await user.click(screen.getByRole("button", { name: "Fermer le message" }));

    expect(screen.getByRole("tabpanel", { name: "Costco" })).toHaveFocus();
  });

  it("passer à un autre magasin range le message de fin des courses", async () => {
    const { user } = renderApp();
    await startCourses(user);
    await checkLaitAndBabybel(user);
    await finishSortie(user);

    await user.click(screen.getByRole("tab", { name: "Maxi" }));

    expect(screen.queryByText("Courses terminées")).toBeNull();
  });

  it("annonce que tout est dans le panier", async () => {
    const { user } = renderApp();
    await startCourses(user);

    await checkEverythingToBuy(user);

    expect(statusTexts()).toContainEqual(
      expect.stringMatching(/dans le panier\. Tout est dans le panier !$/),
    );
  });

  it("une liste vide le dit", async () => {
    const { user } = renderApp();

    for (const trash of screen.getAllByRole("button", { name: /^Retirer .* de la liste$/ })) {
      await user.click(trash);
      await user.click(trash);
    }

    expect(screen.getByText("Rien à acheter chez Costco")).toBeVisible();
  });
});

type User = ReturnType<typeof renderApp>["user"];

async function startCourses(user: User) {
  await user.click(screen.getByRole("switch", { name: "Courses" }));
}

async function checkLaitAndBabybel(user: User) {
  await user.click(screen.getByRole("checkbox", { name: "Lait" }));
  await user.click(screen.getByRole("checkbox", { name: "Babybel" }));
}

/** Every box left to check in the open sections, one at a time: each check moves a row. */
async function checkEverythingToBuy(user: User) {
  const nextBox = () => screen.queryAllByRole("checkbox", { checked: false })[0];
  for (let box = nextBox(); box; box = nextBox()) await user.click(box);
}

async function finishSortie(user: User) {
  await user.click(screen.getByRole("button", { name: "Terminer les courses" }));
  await user.click(screen.getByRole("button", { name: "Terminer" }));
}
