import type { Event } from "@ecureuil/wire";

/**
 * The cursor of an empty journal: `seq` starts at 1, so every event comes after it.
 */
export const startCursor = "0";

/**
 * A cursor is the `seq` of the last event a device has seen, written the way
 * `String(seq)` writes it: no leading zero, small enough to stay a safe integer.
 */
export function isWellFormedCursor(cursor: string) {
  return /^(0|[1-9]\d{0,14})$/.test(cursor);
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

export async function eventsAfter(db: D1Database, cursor: string) {
  const { results: rows } = await db
    .prepare("SELECT * FROM journal WHERE seq > ? ORDER BY seq")
    .bind(Number(cursor))
    .all<JournalRow>();
  const last = rows.at(-1);
  return {
    events: rows.map(({ seq: _, payload, ...envelope }) => {
      const parsed: unknown = JSON.parse(payload);
      return { ...envelope, payload: parsed };
    }),
    cursor: last === undefined ? cursor : String(last.seq),
  };
}

type JournalRow = {
  seq: number;
  id: string;
  at: number;
  actor: string;
  device: string;
  magasin: string | null;
  type: string;
  payload: string;
};
