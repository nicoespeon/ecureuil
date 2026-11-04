import type { Cursor, Event } from "@ecureuil/wire";
import { Context, type Effect } from "effect";

export type { Cursor };

export class Clock extends Context.Service<Clock, { readonly now: Effect.Effect<number> }>()(
  "@ecureuil/domain/Clock",
) {}

export class EventStore extends Context.Service<
  EventStore,
  {
    readonly append: (events: ReadonlyArray<Event>) => Effect.Effect<void>;
    readonly all: Effect.Effect<ReadonlyArray<Event>>;
  }
>()("@ecureuil/domain/EventStore") {}

export class SyncTransport extends Context.Service<
  SyncTransport,
  {
    readonly push: (events: ReadonlyArray<Event>) => Effect.Effect<void>;
    readonly pull: (
      since: Cursor | null,
    ) => Effect.Effect<{ readonly events: ReadonlyArray<Event>; readonly cursor: Cursor }>;
  }
>()("@ecureuil/domain/SyncTransport") {}
