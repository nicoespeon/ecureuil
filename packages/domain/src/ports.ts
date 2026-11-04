import { Context, type Effect } from "effect";
import type { Event } from "./event";

// Position in the journal, as handed out by the server. Opaque to the domain.
export type Cursor = string;

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
