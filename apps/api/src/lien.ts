import type { Actor } from "@ecureuil/wire";

/**
 * Plain SHA-256 is enough: a lien secret is random and high-entropy, not a password
 * someone could guess from a dictionary.
 */
export async function hashSecret(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

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
