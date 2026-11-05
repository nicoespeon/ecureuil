import { env } from "cloudflare:workers";
import { hashSecret } from "../src/secret";

export const secrets = { proprietaire: "secret-du-proprietaire", invite: "secret-de-l-invite" };

/** An empty journal and the two liens, recognised by `secrets`. */
export async function resetFoyer() {
  const liens = await Promise.all(
    Object.entries(secrets).map(async ([role, secret]) =>
      env.DB.prepare("INSERT INTO lien (role, secret_hash, created_at) VALUES (?, ?, 0)").bind(
        role,
        await hashSecret(secret),
      ),
    ),
  );
  await env.DB.batch([
    env.DB.prepare("DELETE FROM journal"),
    env.DB.prepare("DELETE FROM lien"),
    ...liens,
  ]);
}
