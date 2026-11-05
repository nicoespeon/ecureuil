import { seed } from "@ecureuil/domain";
import { authorizationHeader, journalPath, PushRequest } from "@ecureuil/wire";
import { Schema } from "effect";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Pushes the seed's proprietaire events to `POST /journal` with the proprietaire secret.
 * The invite's events are left out: the server refuses a push whose actor is not the lien's role.
 */
export async function pushSeed({
  apiUrl,
  secret,
  fetch,
}: {
  apiUrl: string;
  secret: string;
  fetch: Fetch;
}) {
  const events = seed.filter(({ actor }) => actor === "proprietaire");
  for (const batch of inBatches(events)) {
    const response = await fetch(new URL(journalPath, apiUrl).href, {
      method: "POST",
      headers: { [authorizationHeader]: `Bearer ${secret}` },
      body: encodePush({ events: batch }),
    });
    if (!response.ok) {
      const hint = hints[response.status] ?? "";
      throw new Error(`POST ${journalPath} : ${response.status} ${await response.text()}${hint}`);
    }
  }
  return { pushed: events.length, ignored: seed.filter(({ actor }) => actor !== "proprietaire") };
}

const hints: Partial<Record<number, string>> = {
  401: "\nLIEN_SECRET ne correspond à aucun lien de cette API.",
  403: "\nLIEN_SECRET est celui de l'invite : il faut celui du proprietaire.",
};

const encodePush = Schema.encodeSync(Schema.fromJsonString(PushRequest));

const BATCH_SIZE = 50;

function inBatches<T>(items: ReadonlyArray<T>) {
  return Array.from({ length: Math.ceil(items.length / BATCH_SIZE) }, (_, index) =>
    items.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
  );
}
