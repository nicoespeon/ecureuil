import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { parseArgs } from "node:util";
import { hashSecret } from "../src/secret.ts";

const { values: options } = parseArgs({
  options: {
    remote: { type: "boolean", default: false },
    "app-url": { type: "string", default: "http://localhost:5173" },
  },
});

const liens = await Promise.all(
  (["proprietaire", "invite"] as const).map(async (role) => {
    const secret = randomBytes(32).toString("base64url");
    return { role, secret, hash: await hashSecret(secret) };
  }),
);

const createdAt = Date.now();
// Values are our own role names and hex hashes, so inlining them in SQL is safe.
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
