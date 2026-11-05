import type { Cursor, Event, PullResponse } from "@ecureuil/wire";
import { Context, Data, type Effect } from "effect";

export type { Cursor };

export class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()(
  "@ecureuil/domain/Clock",
) {}

/**
 * The journal of this device, and what it still owes the server (ADR 6).
 */
export class EventStore extends Context.Service<
  EventStore,
  {
    /** Events written on this device: they wait to be pushed. */
    readonly append: (events: ReadonlyArray<Event>) => Effect.Effect<void>;
    readonly all: Effect.Effect<ReadonlyArray<Event>>;
    readonly unpushed: Effect.Effect<ReadonlyArray<Event>>;
    readonly markPushed: (ids: ReadonlyArray<Event["id"]>) => Effect.Effect<void>;
    readonly cursor: Effect.Effect<Cursor | null>;
    /** Keeps the pulled events as pushed, since the server has them, and the cursor, at once. */
    readonly receive: (pulled: PullResponse) => Effect.Effect<void>;
  }
>()("@ecureuil/domain/EventStore") {}

/** Offline is expected, not a defect: the next round tries again. */
export class TransportError extends Data.TaggedError("TransportError")<{
  readonly cause: unknown;
}> {}

export class SyncTransport extends Context.Service<
  SyncTransport,
  {
    readonly push: (events: ReadonlyArray<Event>) => Effect.Effect<void, TransportError>;
    readonly pull: (since: Cursor | null) => Effect.Effect<PullResponse, TransportError>;
  }
>()("@ecureuil/domain/SyncTransport") {}
