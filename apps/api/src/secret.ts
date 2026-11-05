/**
 * 256 random bits, base64url so it fits in a URL fragment. Web Crypto only: the Worker and the
 * `liens` script (Node) share it.
 */
export function newSecret() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

/**
 * Plain SHA-256 is enough: a lien secret is random and high-entropy, not a password
 * someone could guess from a dictionary.
 */
export async function hashSecret(secret: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
