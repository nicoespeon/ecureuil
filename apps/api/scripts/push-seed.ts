import {
  authorizationHeader,
  type Event,
  journalPath,
  PullResponse,
  PushRequest,
} from "@ecureuil/wire";
import { Schema } from "effect";

type Fetch = (url: string, init: RequestInit) => Promise<Response>;

/**
 * Pushes a journal's proprietaire events to `POST /journal` with the proprietaire secret.
 * The invite's events are left out: the server refuses a push whose actor is not the lien's role.
 * With `onlyIfEmpty`, a journal that already holds events is refused: the API ignores the ids
 * it has, so a second push of fixed ids would land in part, without a word.
 */
export async function pushJournal({
  apiUrl,
  secret,
  fetch,
  journal,
  onlyIfEmpty = false,
}: {
  apiUrl: string;
  secret: string;
  fetch: Fetch;
  journal: ReadonlyArray<Event>;
  onlyIfEmpty?: boolean;
}) {
  const url = new URL(journalPath, apiUrl).href;
  const headers = { [authorizationHeader]: `Bearer ${secret}` };
  if (onlyIfEmpty && (await isJournalEmpty(fetch, url, headers)) === false) {
    throw new Error("Le journal n'est pas vide : videz-le d'abord (DELETE FROM journal).");
  }
  const events = journal.filter(({ actor }) => actor === "proprietaire");
  for (const batch of inBatches(events)) {
    const response = await fetch(url, {
      method: "POST",
      headers,
      body: encodePush({ events: batch }),
      // A followed redirect would replay the POST as a GET and answer 200 without writing.
      redirect: "manual",
    });
    if (response.status !== 204) {
      const hint = hints[response.status] ?? "";
      throw new Error(`POST ${journalPath} : ${response.status} ${await response.text()}${hint}`);
    }
  }
  return {
    pushed: events.length,
    ignored: journal.filter(({ actor }) => actor !== "proprietaire"),
  };
}

const hints: Partial<Record<number, string>> = {
  401: "\nLIEN_SECRET ne correspond à aucun lien de cette API.",
  403: "\nLIEN_SECRET est celui de l'invite : il faut celui du proprietaire.",
};

async function isJournalEmpty(fetch: Fetch, url: string, headers: Record<string, string>) {
  const response = await fetch(url, { method: "GET", headers, redirect: "manual" });
  if (response.status !== 200) {
    const hint = hints[response.status] ?? "";
    throw new Error(`GET ${journalPath} : ${response.status} ${await response.text()}${hint}`);
  }
  return decodePull(await response.json()).events.length === 0;
}

const decodePull = Schema.decodeUnknownSync(PullResponse);
const encodePush = Schema.encodeSync(Schema.fromJsonString(PushRequest));

const BATCH_SIZE = 50;

function inBatches<T>(articles: ReadonlyArray<T>) {
  return Array.from({ length: Math.ceil(articles.length / BATCH_SIZE) }, (_, index) =>
    articles.slice(index * BATCH_SIZE, (index + 1) * BATCH_SIZE),
  );
}
