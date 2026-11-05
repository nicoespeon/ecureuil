import { Effect } from "effect";
import { EventStore, SyncTransport } from "./ports";

/**
 * One round: push what this device still owes, then pull what the others wrote (ADR 6).
 * Marks pushed by ids, so a gesture made during the push waits for the next round.
 */
export const sync = Effect.gen(function* () {
  const store = yield* EventStore;
  const transport = yield* SyncTransport;

  const unpushed = yield* store.unpushed;
  if (unpushed.length > 0) {
    yield* transport.push(unpushed);
    yield* store.markPushed(unpushed.map(({ id }) => id));
  }

  yield* store.receive(yield* transport.pull(yield* store.cursor));
});
