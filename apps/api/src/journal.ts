import { Event } from "@ecureuil/wire";
import { Schema } from "effect";

/**
 * A cursor is `String(seq)` of the last event a device has seen, `"0"` before the first one.
 * Anything else was not handed out here: no leading zero, small enough to stay a safe integer.
 */
export function seqOfCursor(cursor: string) {
  return /^(0|[1-9]\d{0,14})$/.test(cursor) ? Number(cursor) : undefined;
}

/**
 * One transaction; ids already in the journal are skipped, so a replayed push writes nothing.
 */
export async function appendEvents(db: D1Database, events: ReadonlyArray<Event>) {
  if (events.length === 0) return;
  const insert = db.prepare(
    `INSERT INTO journal (id, at, actor, device, magasin, type, payload)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT (id) DO NOTHING`,
  );
  await db.batch(
    events.map((event) =>
      insert.bind(
        event.id,
        event.at,
        event.actor,
        event.device,
        event.magasin,
        event.type,
        JSON.stringify(event.payload),
      ),
    ),
  );
}

const decodeJournalEntries = Schema.decodeUnknownSync(
  Schema.Array(Schema.Struct({ seq: Schema.Int, event: Schema.fromJsonString(Event) })),
);

export async function eventsAfter(db: D1Database, seq: number) {
  const { results } = await db
    .prepare(
      `SELECT seq, json_object(
         'id', id, 'at', at, 'actor', actor, 'device', device,
         'magasin', magasin, 'type', type, 'payload', json(payload)
       ) AS event
       FROM journal WHERE seq > ? ORDER BY seq`,
    )
    .bind(seq)
    .all();
  const entries = decodeJournalEntries(results);
  return {
    events: entries.map(({ event }) => event),
    cursor: String(entries.at(-1)?.seq ?? seq),
  };
}
