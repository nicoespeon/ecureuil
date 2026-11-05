import { SyncTransport, TransportError } from "@ecureuil/domain";
import { authorizationHeader, journalPath, PullResponse, type PushRequest } from "@ecureuil/wire";
import { Effect, Schema } from "effect";

const decodePull = Schema.decodeUnknownSync(PullResponse);

/**
 * The API's `/journal` as `@ecureuil/wire` describes it. Any failure (offline, a secret the
 * server does not know, an answer out of contract) is a TransportError: the round fails and
 * the next one tries again.
 */
export function httpTransport({ apiUrl, secret }: { apiUrl: string; secret: string }) {
  const call = <A>(init: RequestInit, query: string, read: (response: Response) => Promise<A>) =>
    Effect.tryPromise({
      try: async () => {
        const response = await fetch(`${apiUrl}${journalPath}${query}`, {
          ...init,
          headers: { [authorizationHeader]: `Bearer ${secret}`, ...init.headers },
        });
        if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
        return read(response);
      },
      catch: (cause) => new TransportError({ cause }),
    });

  return SyncTransport.of({
    push: (events) =>
      call(
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ events } satisfies PushRequest),
        },
        "",
        async () => {},
      ),
    pull: (since) =>
      call({}, since === null ? "" : `?since=${encodeURIComponent(since)}`, async (response) =>
        decodePull(await response.json()),
      ),
  });
}
