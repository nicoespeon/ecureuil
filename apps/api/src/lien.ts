import type { Actor } from "@ecureuil/wire";
import { hashSecret } from "./secret";

export async function roleOfSecret(db: D1Database, secret: string) {
  const presented = new TextEncoder().encode(await hashSecret(secret));
  const { results: liens } = await db
    .prepare("SELECT role, secret_hash FROM lien")
    .all<{ role: Actor; secret_hash: string }>();
  const lien = liens.find(({ secret_hash }) =>
    crypto.subtle.timingSafeEqual(presented, new TextEncoder().encode(secret_hash)),
  );
  return lien?.role;
}
