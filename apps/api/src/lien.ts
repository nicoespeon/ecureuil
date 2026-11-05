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

const decodeCreatedAt = Schema.decodeUnknownSync(Schema.NullOr(Schema.Int));

/** Epoch milliseconds, `null` when this role has no lien. */
export async function lienCreatedAt(db: D1Database, role: Actor) {
  const createdAt = await db
    .prepare("SELECT created_at FROM lien WHERE role = ?")
    .bind(role)
    .first("created_at");
  return decodeCreatedAt(createdAt);
}

/** The old secret of this role stops working at once. */
export async function replaceLien(db: D1Database, role: Actor, secret: string) {
  await db
    .prepare("INSERT OR REPLACE INTO lien (role, secret_hash, created_at) VALUES (?, ?, ?)")
    .bind(role, await hashSecret(secret), Date.now())
    .run();
}
