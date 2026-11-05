import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { accesStore } from "./acces";
import { API_URL, fakeLienApi } from "./fakeLienApi";
import { Reglages } from "./Reglages";

const secrets = { proprietaire: "secret-du-proprietaire", invite: "secret-de-l-invite" };

describe("les réglages", () => {
  it.each([
    ["Propriétaire", secrets.proprietaire],
    ["Invité", secrets.invite],
  ])("montrent le rôle %s de l'appareil", async (role, secret) => {
    renderReglages(secret);

    expect(await screen.findByText(role)).toBeVisible();
  });

  it("retiennent le nom de l'appareil", async () => {
    const { user, unmount } = renderReglages(secrets.invite);

    await user.type(screen.getByRole("textbox", { name: "Nom de l'appareil" }), "Mac de Mariane");
    await user.click(screen.getByRole("button", { name: "Enregistrer" }));
    unmount();
    renderReglages(secrets.invite);

    expect(screen.getByRole("textbox", { name: "Nom de l'appareil" })).toHaveValue(
      "Mac de Mariane",
    );
  });

  it("sans lien, disent que l'appareil est seul et proposent de coller le lien", () => {
    renderReglages(null);

    expect(screen.getByText(/sans synchronisation/)).toBeVisible();
    expect(screen.getByRole("textbox", { name: "Lien d'accès" })).toBeVisible();
  });
});

describe("un nouveau lien pour Mariane", () => {
  it("dit quand son lien actuel a été créé", async () => {
    renderReglages(secrets.proprietaire, fakeLienApi(secrets, new Date(2026, 10, 5).getTime()));

    expect(await screen.findByText("Un lien existe pour Mariane, créé le 5 nov.")).toBeVisible();
  });

  it("s'affiche une fois créé", async () => {
    const { user } = renderReglages(secrets.proprietaire);

    await createLienForMariane(user);

    expect(await screen.findByRole("textbox", { name: "Lien de Mariane" })).toHaveValue(
      `${location.origin}/#secret-invite-1`,
    );
  });

  it("se copie", async () => {
    const { user } = renderReglages(secrets.proprietaire);
    await createLienForMariane(user);

    await user.click(await screen.findByRole("button", { name: "Copier" }));

    expect(await navigator.clipboard.readText()).toBe(`${location.origin}/#secret-invite-1`);
    expect(screen.getByText("Lien copié")).toBeVisible();
  });

  it("« Annuler » garde le lien actuel de Mariane", async () => {
    const fetch = vi.fn(fakeLienApi(secrets));
    const { user } = renderReglages(secrets.proprietaire, fetch);
    await user.click(await screen.findByRole("button", { name: "Nouveau lien pour Mariane" }));

    await user.click(screen.getByRole("button", { name: "Annuler" }));

    expect(fetch).not.toHaveBeenCalledWith(
      expect.stringContaining("/lien/invite"),
      expect.anything(),
    );
  });

  it("dit quand le lien n'a pas pu être créé", async () => {
    const { user } = renderReglages(secrets.proprietaire);
    await screen.findByText("Propriétaire");
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));

    await createLienForMariane(user);

    expect(await screen.findByRole("alert")).toHaveTextContent(/n'a pas pu être créé/);
  });

  it("sans lien pour Mariane, se crée sans avertir et date le nouveau", async () => {
    vi.useFakeTimers({ toFake: ["Date"], now: new Date(2026, 10, 7) });
    const { user } = renderReglages(
      secrets.proprietaire,
      fakeLienApi({ ...secrets, invite: null }),
    );

    await user.click(await screen.findByRole("button", { name: "Créer le lien pour Mariane" }));

    expect(await screen.findByRole("textbox", { name: "Lien de Mariane" })).toHaveValue(
      `${location.origin}/#secret-invite-1`,
    );
    expect(screen.getByText("Un lien existe pour Mariane, créé le 7 nov.")).toBeVisible();
  });

  it("n'est pas proposé à l'invité", async () => {
    renderReglages(secrets.invite);
    await screen.findByText("Invité");

    expect(screen.queryByRole("button", { name: "Nouveau lien pour Mariane" })).toBeNull();
  });
});

type User = ReturnType<typeof userEvent.setup>;

async function createLienForMariane(user: User) {
  await user.click(await screen.findByRole("button", { name: "Nouveau lien pour Mariane" }));
  await user.click(screen.getByRole("button", { name: "Remplacer le lien" }));
}

function renderReglages(secret: string | null, fetch = fakeLienApi(secrets)) {
  vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  const acces = accesStore({ apiUrl: API_URL, secret, reload: () => {} });
  const { unmount } = render(<Reglages acces={acces} />);
  return { user, unmount };
}
