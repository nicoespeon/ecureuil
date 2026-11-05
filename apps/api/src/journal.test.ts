import { env } from "cloudflare:workers";
import { authorizationHeader, Event, journalPath, PullResponse } from "@ecureuil/wire";
import { Schema } from "effect";
import { beforeEach, expect, it } from "vitest";
import { app } from "./index";
import { hashSecret } from "./secret";

const secrets = { proprietaire: "secret-du-proprietaire", invite: "secret-de-l-invite" };

beforeEach(async () => {
  const liens = await Promise.all(
    Object.entries(secrets).map(async ([role, secret]) =>
      env.DB.prepare("INSERT INTO lien (role, secret_hash, created_at) VALUES (?, ?, 0)").bind(
        role,
        await hashSecret(secret),
      ),
    ),
  );
  await env.DB.batch([
    env.DB.prepare("DELETE FROM journal"),
    env.DB.prepare("DELETE FROM lien"),
    ...liens,
  ]);
});

it("un pull renvoie ce qu'un push a envoyé, avec un cursor", async () => {
  const events = [itemCreated("e1"), itemCreated("e2")];

  const pushed = await push({ events });

  expect(pushed.status).toBe(204);
  expect(await pullJournal()).toEqual({ events, cursor: expect.any(String) });
});

it("ignore les événements déjà reçus : un push rejoué ne crée rien", async () => {
  const event = itemCreated("e1");
  await push({ events: [event] });

  const replayed = await push({ events: [event] });

  expect(replayed.status).toBe(204);
  expect((await pullJournal()).events).toEqual([event]);
});

it("un pull ne renvoie que ce qui suit le cursor", async () => {
  await push({ events: [itemCreated("e1")] });
  const { cursor } = await pullJournal();
  const newer = itemCreated("e2");
  await push({ events: [newer] });

  expect(await pullJournal(cursor)).toEqual({ events: [newer], cursor: expect.any(String) });
});

it("garde le cursor quand rien n'est nouveau", async () => {
  await push({ events: [itemCreated("e1")] });
  const { cursor } = await pullJournal();

  expect(await pullJournal(cursor)).toEqual({ events: [], cursor });
});

it("un journal vide commence au cursor 0", async () => {
  expect(await pullJournal()).toEqual({ events: [], cursor: "0" });
});

it("accepte le push de l'invite pour ses propres événements", async () => {
  const event = itemCreated("e1", "invite");

  const pushed = await push({ events: [event] }, secrets.invite);

  expect(pushed.status).toBe(204);
  expect((await pullJournal()).events).toEqual([event]);
});

it("refuse tout le push quand l'actor d'un événement n'est pas le rôle du lien", async () => {
  const pushed = await push(
    { events: [itemCreated("e1", "invite"), itemCreated("e2", "proprietaire")] },
    secrets.invite,
  );

  expect(pushed.status).toBe(403);
  expect((await pullJournal()).events).toEqual([]);
});

it.each([
  ["un push avec un secret inconnu", () => push({ events: [] }, "pas-un-secret")],
  ["un pull avec un secret inconnu", () => pull(undefined, "pas-un-secret")],
  ["un pull sans le header", () => app.request(journalPath, {}, env)],
])("répond 401 à %s", async (_, send) => {
  expect((await send()).status).toBe(401);
});

it("reconnaît encore un secret quand une autre ligne de la table lien est mal formée", async () => {
  await env.DB.prepare("UPDATE lien SET secret_hash = 'abc' WHERE role = 'proprietaire'").run();

  expect((await pull(undefined, secrets.invite)).status).toBe(200);
});

it("répond 400 avec l'erreur de schéma à un push invalide", async () => {
  const pushed = await push({ events: [{ id: "e1" }] });

  expect(pushed.status).toBe(400);
  expect(await pushed.json()).toEqual({ error: expect.stringContaining('at ["events"][0]') });
});

it("répond 400 à un body qui n'est pas du JSON", async () => {
  const pushed = await app.request(
    journalPath,
    { method: "POST", headers: authorization(secrets.proprietaire), body: "{" },
    env,
  );

  expect(pushed.status).toBe(400);
});

it.each(["pas-un-curseur", "007", "99999999999999999999"])(
  "répond 400 au cursor %s, qu'il ne donne jamais",
  async (cursor) => {
    expect((await pull(cursor)).status).toBe(400);
  },
);

it("laisse l'app, servie depuis une autre origine, pousser avec son secret", async () => {
  const preflight = await app.request(journalPath, {
    method: "OPTIONS",
    headers: {
      Origin: "https://ecureuil.pages.dev",
      "Access-Control-Request-Method": "POST",
      "Access-Control-Request-Headers": "authorization, content-type",
    },
  });

  expect(preflight.status).toBe(204);
  expect(Object.fromEntries(preflight.headers)).toMatchObject({
    "access-control-allow-origin": "*",
    "access-control-allow-headers": expect.stringMatching(/authorization/i),
  });
});

it("laisse l'app lire le pull depuis une autre origine", async () => {
  const pulled = await app.request(journalPath, {
    headers: { Origin: "https://ecureuil.pages.dev", ...authorization(secrets.proprietaire) },
  });

  expect(pulled.headers.get("Access-Control-Allow-Origin")).toBe("*");
});

function itemCreated(id: string, actor = "proprietaire") {
  return Schema.decodeUnknownSync(Event)({
    id,
    at: 1_000,
    actor,
    device: `device-${actor}`,
    magasin: null,
    type: "ItemCreated",
    payload: { itemId: `item-${id}`, name: "Lait" },
  });
}

function push(body: unknown, secret = secrets.proprietaire) {
  return app.request(
    journalPath,
    { method: "POST", headers: authorization(secret), body: JSON.stringify(body) },
    env,
  );
}

function pull(since?: string, secret = secrets.proprietaire) {
  const query = since === undefined ? "" : `?${new URLSearchParams({ since })}`;
  return app.request(`${journalPath}${query}`, { headers: authorization(secret) }, env);
}

async function pullJournal(since?: string) {
  const response = await pull(since);
  return Schema.decodeUnknownSync(PullResponse)(await response.json());
}

function authorization(secret: string) {
  return { [authorizationHeader]: `Bearer ${secret}` };
}
