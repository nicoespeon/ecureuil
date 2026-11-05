import { env } from "cloudflare:workers";
import { authorizationHeader, inviteLienPath, lienPath, NewLienResponse } from "@ecureuil/wire";
import { Schema } from "effect";
import { beforeEach, describe, expect, it } from "vitest";
import { resetFoyer, secrets } from "../test/liens";
import { app } from "./index";

beforeEach(resetFoyer);

describe("le rôle du lien", () => {
  it.each(["proprietaire", "invite"] as const)(
    "répond %s au porteur de son secret",
    async (role) => {
      const response = await getLien(secrets[role]);

      expect(await response.json()).toEqual({ role });
    },
  );

  it("répond 401 à un secret inconnu", async () => {
    expect((await getLien("pas-un-secret")).status).toBe(401);
  });

  it("laisse l'app le lire depuis une autre origine", async () => {
    const preflight = await app.request(lienPath, {
      method: "OPTIONS",
      headers: {
        Origin: "https://ecureuil.pages.dev",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "authorization",
      },
    });

    expect(preflight.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});

describe("un nouveau lien pour l'invite", () => {
  it("remplace le lien de l'invite : le nouveau secret entre, l'ancien est refusé", async () => {
    const regenerated = await regenerateInvite(secrets.proprietaire);
    const { secret } = Schema.decodeUnknownSync(NewLienResponse)(await regenerated.json());

    expect(await (await getLien(secret)).json()).toEqual({ role: "invite" });
    expect((await getLien(secrets.invite)).status).toBe(401);
    expect((await getLien(secrets.proprietaire)).status).toBe(200);
  });

  it("refuse l'invite, dont le lien continue de marcher", async () => {
    const regenerated = await regenerateInvite(secrets.invite);

    expect(regenerated.status).toBe(403);
    expect((await getLien(secrets.invite)).status).toBe(200);
  });

  it("répond 401 à un secret inconnu", async () => {
    expect((await regenerateInvite("pas-un-secret")).status).toBe(401);
  });

  it("laisse l'app le demander depuis une autre origine", async () => {
    const regenerated = await app.request(
      inviteLienPath,
      {
        method: "POST",
        headers: { Origin: "https://ecureuil.pages.dev", ...authorization(secrets.proprietaire) },
      },
      env,
    );

    expect(regenerated.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });

  it("donne un secret différent à chaque fois", async () => {
    const first = await (await regenerateInvite(secrets.proprietaire)).json();
    const second = await (await regenerateInvite(secrets.proprietaire)).json();

    expect(first).not.toEqual(second);
  });
});

function getLien(secret: string) {
  return app.request(lienPath, { headers: authorization(secret) }, env);
}

function regenerateInvite(secret: string) {
  return app.request(inviteLienPath, { method: "POST", headers: authorization(secret) }, env);
}

function authorization(secret: string) {
  return { [authorizationHeader]: `Bearer ${secret}` };
}
