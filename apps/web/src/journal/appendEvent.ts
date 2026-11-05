import { type Actor, Event } from "@ecureuil/wire";
import { Schema } from "effect";
import { thisDevice } from "./device";
import type { Journal } from "./journal";

const decodeEvent = Schema.decodeUnknownSync(Event);

export type EventType = Event["type"];
export type PayloadOf<T extends EventType> = Extract<Event, { readonly type: T }>["payload"];

/**
 * Appends an event written on this device in the role of its lien, decoded through the wire
 * contract so the journal never holds an event the API would refuse.
 */
export function appendEvent<T extends EventType>(
  journal: Journal,
  {
    actor,
    type,
    magasin,
    payload,
  }: { actor: Actor; type: T; magasin: string; payload: PayloadOf<T> },
) {
  journal
    .append(
      decodeEvent({
        id: crypto.randomUUID(),
        at: nextAt(journal.all()),
        actor,
        device: thisDevice(),
        magasin,
        type,
        payload,
      }),
    )
    // No UI reports storage failures yet: the gesture shows, but a reload would lose it.
    .catch((error: unknown) => console.error("The gesture was not saved on this device", error));
}

/**
 * Replay sorts by (at, id) and ids are random: two gestures in the same millisecond would
 * replay in a random order, so `at` never goes backwards on this device.
 */
function nextAt(events: ReadonlyArray<Event>) {
  const latest = events.reduce((max, event) => Math.max(max, event.at), 0);
  return Math.max(Date.now(), latest + 1);
}
