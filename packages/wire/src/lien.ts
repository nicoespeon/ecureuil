import { Schema } from "effect";
import { Actor } from "./event";

/**
 * `GET` answers the role of the lien whose secret is presented.
 */
export const lienPath = "/lien";

export const LienResponse = Schema.Struct({ role: Actor });
export type LienResponse = Schema.Schema.Type<typeof LienResponse>;

/**
 * `POST` replaces the invite's lien with a new secret, for the proprietaire only: the old one
 * stops working. The proprietaire's own lien is never regenerated from the app.
 */
export const inviteLienPath = "/lien/invite";

export const NewLienResponse = Schema.Struct({ secret: Schema.NonEmptyString });
export type NewLienResponse = Schema.Schema.Type<typeof NewLienResponse>;
