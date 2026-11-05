import { Effect, Result } from "effect";
import { EventStore, SyncTransport } from "./ports";

/**
 * One round: push what this device still owes, then pull what the others wrote (ADR 6).
 * Marks pushed by ids, so a gesture made during the push waits for the next round. A refused
 * push still lets the pull through, then fails the round: one bad event must not cut the
 * device off from the others.
 */
export const sync = Effect.gen(function* () {
  const store = yield* EventStore;
  const transport = yield* SyncTransport;

  const unpushed = yield* store.unpushed;
  const pushed = yield* Effect.result(
    unpushed.length === 0
      ? Effect.void
      : transport
          .push(unpushed)
          .pipe(Effect.andThen(store.markPushed(unpushed.map(({ id }) => id)))),
  );

  yield* store.receive(yield* transport.pull(yield* store.cursor));
  if (Result.isFailure(pushed)) return yield* Effect.fail(pushed.failure);
});
