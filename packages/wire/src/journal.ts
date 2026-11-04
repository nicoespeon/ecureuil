import { Schema } from "effect";
import { Event } from "./event";

/**
 * One path for the journal: `POST` pushes, `GET` pulls.
 */
export const journalPath = "/journal";

/**
 * Carries the secret of the link (proprietaire or invite) as `Bearer <secret>`.
 */
export const authorizationHeader = "Authorization";

/**
 * Position in the journal, handed out by the server and sent back as is.
 */
export const Cursor = Schema.NonEmptyString;
export type Cursor = Schema.Schema.Type<typeof Cursor>;

/**
 * Body of `POST /journal`. The server ignores ids it already has and answers 204.
 */
export const PushRequest = Schema.Struct({ events: Schema.Array(Event) });
export type PushRequest = Schema.Schema.Type<typeof PushRequest>;

/**
 * Query of `GET /journal`: no `since` reads the journal from the start.
 */
export const PullQuery = Schema.Struct({ since: Schema.optionalKey(Cursor) });
export type PullQuery = Schema.Schema.Type<typeof PullQuery>;

export const PullResponse = Schema.Struct({ events: Schema.Array(Event), cursor: Cursor });
export type PullResponse = Schema.Schema.Type<typeof PullResponse>;
