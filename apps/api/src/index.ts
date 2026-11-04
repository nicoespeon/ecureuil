import {
  type Actor,
  authorizationHeader,
  journalPath,
  PullQuery,
  PushRequest,
} from "@ecureuil/wire";
import { Result, Schema } from "effect";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { appendEvents, eventsAfter, isWellFormedCursor, startCursor } from "./journal";
import { roleOfSecret } from "./lien";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  role: Actor;
};

type ApiEnv = { Bindings: Bindings; Variables: Variables };

export const app = new Hono<ApiEnv>();

app.get("/health", (c) => c.json({ ok: true }));

app.use(
  journalPath,
  bearerAuth<ApiEnv>({
    headerName: authorizationHeader,
    verifyToken: async (secret, c) => {
      const role = await roleOfSecret(c.env.DB, secret);
      if (role === undefined) return false;
      c.set("role", role);
      return true;
    },
  }),
);

const decodePush = Schema.decodeUnknownResult(Schema.fromJsonString(PushRequest));

app.post(journalPath, async (c) => {
  const push = decodePush(await c.req.text());
  if (Result.isFailure(push)) return c.json({ error: push.failure.message }, 400);

  const { events } = push.success;
  if (events.some(({ actor }) => actor !== c.get("role"))) {
    return c.json({ error: "Every event's actor must be the role of the lien" }, 403);
  }

  await appendEvents(c.env.DB, events);
  return c.body(null, 204);
});

const decodePull = Schema.decodeUnknownResult(PullQuery);

app.get(journalPath, async (c) => {
  const pull = decodePull(c.req.query());
  if (Result.isFailure(pull)) return c.json({ error: pull.failure.message }, 400);

  const since = pull.success.since ?? startCursor;
  if (!isWellFormedCursor(since)) return c.json({ error: `Unknown cursor: ${since}` }, 400);

  return c.json(await eventsAfter(c.env.DB, since));
});

export default app;
