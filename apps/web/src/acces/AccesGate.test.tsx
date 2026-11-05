import type { Actor } from "@ecureuil/wire";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { lienSecret, rememberLienSecret } from "../journal/device";
import { AccesGate } from "./AccesGate";
import { accesStore } from "./acces";
import { API_URL, fakeLienApi } from "./fakeLienApi";

const secrets = { proprietaire: "secret-du-proprietaire", invite: "secret-de-l-invite" };

describe("l'accès au foyer", () => {
  it("un appareil sans lien entre seul, en propriétaire", () => {
    renderGate({ apiUrl: API_URL, secret: null });

    expect(screen.getByText("Entré en proprietaire")).toBeVisible();
  });

  it("entre avec le rôle que l'API donne au lien", async () => {
    vi.stubGlobal("fetch", fakeLienApi(secrets));

    renderGate({ secret: secrets.invite });

    expect(await screen.findByText("Entré en invite")).toBeVisible();
  });

  it("n'ouvre pas la liste tant que le rôle n'est pas connu", () => {
    vi.stubGlobal("fetch", () => new Promise(() => {}));

    renderGate({ secret: secrets.invite });

    expect(screen.getByText("Connexion en cours…")).toBeVisible();
    expect(screen.queryByText(/Entré en/)).toBeNull();
  });

  it("hors ligne au premier lancement, explique et réessaie", async () => {
    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    const { user } = renderGate({ secret: secrets.invite });
    await screen.findByText(/Connexion impossible/);

    vi.stubGlobal("fetch", fakeLienApi(secrets));
    await user.click(screen.getByRole("button", { name: "Réessayer" }));

    expect(await screen.findByText("Entré en invite")).toBeVisible();
  });

  it("retient le rôle : le lancement suivant entre même hors ligne", async () => {
    vi.stubGlobal("fetch", fakeLienApi(secrets));
    rememberLienSecret(secrets.invite);
    const { unmount } = renderGate({ secret: secrets.invite });
    await screen.findByText("Entré en invite");
    unmount();

    vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Failed to fetch")));
    renderGate({ secret: secrets.invite });

    expect(screen.getByText("Entré en invite")).toBeVisible();
  });

  it("montre un lien refusé par l'API, même avec un rôle retenu", async () => {
    vi.stubGlobal("fetch", fakeLienApi(secrets));
    rememberLienSecret(secrets.invite);
    const { unmount } = renderGate({ secret: secrets.invite });
    await screen.findByText("Entré en invite");
    unmount();

    renderGate({ secret: secrets.invite }, fakeLienApi({ ...secrets, invite: "remplacé" }));

    expect(await screen.findByRole("heading", { name: "Ce lien ne marche plus" })).toBeVisible();
    expect(screen.queryByText(/Entré en/)).toBeNull();
  });

  it("un lien collé est retenu et l'app redémarre avec lui", async () => {
    vi.stubGlobal("fetch", fakeLienApi(secrets));
    const reload = vi.fn();
    const { user } = renderGate({ secret: "secret-perdu", reload });

    await user.type(
      await screen.findByRole("textbox", { name: "Lien d'accès" }),
      "https://ecureuil.test/#nouveau-secret",
    );
    await user.click(screen.getByRole("button", { name: "Utiliser ce lien" }));

    expect(lienSecret()).toBe("nouveau-secret");
    expect(reload).toHaveBeenCalledOnce();
  });
});

function renderGate(
  {
    apiUrl = API_URL,
    secret,
    reload = () => {},
  }: { apiUrl?: string; secret: string | null; reload?: () => void },
  fetch?: ReturnType<typeof fakeLienApi>,
) {
  if (fetch) vi.stubGlobal("fetch", fetch);
  const user = userEvent.setup();
  const acces = accesStore({ apiUrl, secret, reload });
  const { unmount } = render(
    <AccesGate acces={acces}>{(role: Actor) => <p>Entré en {role}</p>}</AccesGate>,
  );
  return { user, unmount };
}
