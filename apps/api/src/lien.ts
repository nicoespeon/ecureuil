import { Actor } from "@ecureuil/wire";
import { Schema } from "effect";
import { hashSecret } from "./secret";

const decodeLiens = Schema.decodeUnknownSync(
  Schema.Array(Schema.Struct({ role: Actor, secret_hash: Schema.String })),
);

export async function roleOfSecret(db: D1Database, secret: string) {
  const presented = new TextEncoder().encode(await hashSecret(secret));
  const { results } = await db.prepare("SELECT role, secret_hash FROM lien").all();
  const liens = decodeLiens(results);
  const lien = liens.find(({ secret_hash }) => {
    const stored = new TextEncoder().encode(secret_hash);
    // timingSafeEqual throws on different lengths; a hash's length gives nothing away.
    return stored.length === presented.length && crypto.subtle.timingSafeEqual(presented, stored);
  });
  return lien?.role;
}
