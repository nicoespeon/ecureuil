import type { Actor } from "@ecureuil/wire";
import { hashSecret } from "./secret";

export async function roleOfSecret(db: D1Database, secret: string) {
  const presented = new TextEncoder().encode(await hashSecret(secret));
  const { results: liens } = await db
    .prepare("SELECT role, secret_hash FROM lien")
    .all<{ role: Actor; secret_hash: string }>();
  const lien = liens.find(({ secret_hash }) => {
    const stored = new TextEncoder().encode(secret_hash);
    // timingSafeEqual throws on different lengths; a hash's length gives nothing away.
    return stored.length === presented.length && crypto.subtle.timingSafeEqual(presented, stored);
  });
  return lien?.role;
}
