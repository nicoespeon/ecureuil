import {
  type Actor,
  authorizationHeader,
  inviteLienPath,
  journalPath,
  type LienResponse,
  lienPath,
  type NewLienResponse,
  PullQuery,
  type PullResponse,
  PushRequest,
} from "@ecureuil/wire";
import { Result, Schema } from "effect";
import { Hono } from "hono";
import { bearerAuth } from "hono/bearer-auth";
import { cors } from "hono/cors";
import { appendEvents, eventsAfter, seqOfCursor } from "./journal";
import { replaceLien, roleOfSecret } from "./lien";
import { newSecret } from "./secret";

type Bindings = {
  DB: D1Database;
};

type Variables = {
  role: Actor;
};

type ApiEnv = { Bindings: Bindings; Variables: Variables };

export const app = new Hono<ApiEnv>();

app.get("/health", (c) => c.json({ ok: true }));

// The app lives on another origin (Pages). Any origin is fine: access rides on the Bearer
// secret, never on cookies, and the preflight must pass before the secret is checked.
const authorized = [
  cors(),
  bearerAuth<ApiEnv>({
    headerName: authorizationHeader,
    noAuthenticationHeader: { message: { error: "Lien d'accès manquant" } },
    invalidAuthenticationHeader: {
      message: { error: "En-tête Authorization invalide : « Bearer <secret> » attendu" },
    },
    invalidToken: { message: { error: "Lien d'accès inconnu ou remplacé" } },
    verifyToken: async (secret, c) => {
      const role = await roleOfSecret(c.env.DB, secret);
      if (role === undefined) return false;
      c.set("role", role);
      return true;
    },
  }),
];
for (const path of [journalPath, lienPath, inviteLienPath]) app.use(path, ...authorized);

app.get(lienPath, (c) => c.json({ role: c.get("role") } satisfies LienResponse));

app.post(inviteLienPath, async (c) => {
  if (c.get("role") !== "proprietaire") {
    return c.json({ error: "Seul le propriétaire peut créer un nouveau lien pour l'invité" }, 403);
  }
  const secret = newSecret();
  await replaceLien(c.env.DB, "invite", secret);
  return c.json({ secret } satisfies NewLienResponse);
});

const decodePush = Schema.decodeUnknownResult(Schema.fromJsonString(PushRequest));

app.post(journalPath, async (c) => {
  const push = decodePush(await c.req.text());
  if (Result.isFailure(push))
    return c.json({ error: `Requête invalide : ${push.failure.message}` }, 400);

  const { events } = push.success;
  if (events.some(({ actor }) => actor !== c.get("role"))) {
    return c.json({ error: "Chaque événement doit avoir pour actor le rôle du lien" }, 403);
  }

  await appendEvents(c.env.DB, events);
  return c.body(null, 204);
});

const decodePull = Schema.decodeUnknownResult(PullQuery);

app.get(journalPath, async (c) => {
  const pull = decodePull(c.req.query());
  if (Result.isFailure(pull))
    return c.json({ error: `Requête invalide : ${pull.failure.message}` }, 400);

  const { since = "0" } = pull.success;
  const seq = seqOfCursor(since);
  if (seq === undefined) return c.json({ error: `Curseur inconnu : ${since}` }, 400);

  return c.json((await eventsAfter(c.env.DB, seq)) satisfies PullResponse);
});

export default app;
