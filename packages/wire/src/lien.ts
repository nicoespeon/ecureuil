import { Schema } from "effect";
import { Actor } from "./event";

/**
 * `GET` answers the role of the lien whose secret is presented, and when the invite's lien was
 * created (`null` while there is none).
 */
export const lienPath = "/lien";

export const LienResponse = Schema.Struct({
  role: Actor,
  invite: Schema.NullOr(Schema.Struct({ createdAt: Schema.Int })),
});
export type LienResponse = Schema.Schema.Type<typeof LienResponse>;

/**
 * `POST` replaces the invite's lien with a new secret, for the proprietaire only: the old one
 * stops working. The proprietaire's own lien is never regenerated from the app.
 */
export const inviteLienPath = "/lien/invite";

export const NewLienResponse = Schema.Struct({ secret: Schema.NonEmptyString });
export type NewLienResponse = Schema.Schema.Type<typeof NewLienResponse>;
