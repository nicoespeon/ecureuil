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

it("pulls back what was pushed, with a cursor", async () => {
  const events = [itemCreated("e1"), itemCreated("e2")];

  const pushed = await push({ events });

  expect(pushed.status).toBe(204);
  expect(await pullJournal()).toEqual({ events, cursor: expect.any(String) });
});

it("ignores events it already has, so a replayed push creates nothing", async () => {
  const event = itemCreated("e1");
  await push({ events: [event] });

  const replayed = await push({ events: [event] });

  expect(replayed.status).toBe(204);
  expect((await pullJournal()).events).toEqual([event]);
});

it("pulls only what came after the cursor", async () => {
  await push({ events: [itemCreated("e1")] });
  const { cursor } = await pullJournal();
  const newer = itemCreated("e2");
  await push({ events: [newer] });

  expect(await pullJournal(cursor)).toEqual({ events: [newer], cursor: expect.any(String) });
});

it("keeps the cursor when nothing is new", async () => {
  await push({ events: [itemCreated("e1")] });
  const { cursor } = await pullJournal();

  expect(await pullJournal(cursor)).toEqual({ events: [], cursor });
});

it("starts an empty journal at cursor 0", async () => {
  expect(await pullJournal()).toEqual({ events: [], cursor: "0" });
});

it("lets the invite push its own events", async () => {
  const event = itemCreated("e1", "invite");

  const pushed = await push({ events: [event] }, secrets.invite);

  expect(pushed.status).toBe(204);
  expect((await pullJournal()).events).toEqual([event]);
});

it("refuses the whole push when an event's actor is not the link's role", async () => {
  const pushed = await push(
    { events: [itemCreated("e1", "invite"), itemCreated("e2", "proprietaire")] },
    secrets.invite,
  );

  expect(pushed.status).toBe(403);
  expect((await pullJournal()).events).toEqual([]);
});

it.each([
  ["a push with an unknown secret", () => push({ events: [] }, "pas-un-secret")],
  ["a pull with an unknown secret", () => pull(undefined, "pas-un-secret")],
  ["a pull without the header", () => app.request(journalPath, {}, env)],
])("answers 401 to %s", async (_, send) => {
  expect((await send()).status).toBe(401);
});

it("still recognizes a secret when another lien row is malformed", async () => {
  await env.DB.prepare("UPDATE lien SET secret_hash = 'abc' WHERE role = 'proprietaire'").run();

  expect((await pull(undefined, secrets.invite)).status).toBe(200);
});

it("answers 400 with the schema error to an invalid push", async () => {
  const pushed = await push({ events: [{ id: "e1" }] });

  expect(pushed.status).toBe(400);
  expect(await pushed.json()).toEqual({ error: expect.stringContaining('at ["events"][0]') });
});

it("answers 400 to a body that is not JSON", async () => {
  const pushed = await app.request(
    journalPath,
    { method: "POST", headers: authorization(secrets.proprietaire), body: "{" },
    env,
  );

  expect(pushed.status).toBe(400);
});

it.each(["pas-un-curseur", "007", "99999999999999999999"])(
  "answers 400 to the cursor %s, which it never hands out",
  async (cursor) => {
    expect((await pull(cursor)).status).toBe(400);
  },
);

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
