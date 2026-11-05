import { env } from "cloudflare:workers";
import { seed } from "@ecureuil/domain";
import { authorizationHeader, journalPath, PullResponse } from "@ecureuil/wire";
import { Schema } from "effect";
import { beforeEach, expect, it } from "vitest";
import { app } from "../src/index";
import { resetFoyer, secrets } from "../test/liens";
import { pushSeed } from "./push-seed";

const apiUrl = "https://api.test";

beforeEach(resetFoyer);

it("pousse les événements proprietaire du seed et ignore ceux de l'invite", async () => {
  const result = await pushSeed({ apiUrl, secret: secrets.proprietaire, fetch: toApp });

  const proprietaireEvents = seed.filter(({ actor }) => actor === "proprietaire");
  expect(result).toEqual({
    pushed: proprietaireEvents.length,
    ignored: seed.filter(({ actor }) => actor === "invite"),
  });
  expect(await pullAll()).toEqual(proprietaireEvents);
});

it.each([
  ["un secret inconnu", "pas-un-secret", "401"],
  ["le secret de l'invite", secrets.invite, "403"],
])("s'arrête avec le statut HTTP sur %s", async (_, secret, status) => {
  await expect(pushSeed({ apiUrl, secret, fetch: toApp })).rejects.toThrow(status);
});

function toApp(url: string, init: RequestInit) {
  return Promise.resolve(app.request(url, init, env));
}

async function pullAll() {
  const response = await app.request(
    `${apiUrl}${journalPath}`,
    { headers: { [authorizationHeader]: `Bearer ${secrets.proprietaire}` } },
    env,
  );
  return Schema.decodeUnknownSync(PullResponse)(await response.json()).events;
}
