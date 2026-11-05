import { execFileSync } from "node:child_process";
import { parseArgs } from "node:util";
import { hashSecret, newSecret } from "../src/secret.ts";

const { values: options } = parseArgs({
  options: {
    remote: { type: "boolean", default: false },
    "app-url": { type: "string", default: "http://localhost:5173" },
  },
});

const liens = await Promise.all(
  (["proprietaire", "invite"] as const).map(async (role) => {
    const secret = newSecret();
    return { role, secret, hash: await hashSecret(secret) };
  }),
);

const createdAt = Date.now();
/** Our own role names and hex hashes only, so inlining them in SQL is safe. */
const sql = liens
  .map(
    ({ role, hash }) =>
      `INSERT OR REPLACE INTO lien (role, secret_hash, created_at) VALUES ('${role}', '${hash}', ${createdAt});`,
  )
  .join("\n");

execFileSync(
  "wrangler",
  ["d1", "execute", "ecureuil", options.remote ? "--remote" : "--local", "--command", sql],
  { stdio: "inherit" },
);

for (const { role, secret } of liens) {
  console.log(`${role}: ${options["app-url"]}/#${secret}`);
}
