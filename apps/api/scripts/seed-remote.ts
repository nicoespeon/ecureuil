import { parseArgs } from "node:util";
import { pushSeed } from "./push-seed.ts";

const { values: options } = parseArgs({
  options: { remote: { type: "boolean", default: false } },
});

const apiUrl = options.remote ? requiredEnv("API_URL") : "http://localhost:8787";

try {
  const { pushed, ignored } = await pushSeed({ apiUrl, secret: requiredEnv("LIEN_SECRET"), fetch });
  console.log(`${pushed} événements envoyés à ${apiUrl}`);
  for (const { type } of ignored) console.log(`1 événement invite ignoré (${type})`);
} catch (error) {
  console.error(describe(error));
  process.exit(1);
}

/** fetch only says "fetch failed"; the network reason (ECONNREFUSED, ENOTFOUND…) is in its cause. */
function describe(error: unknown) {
  if (!(error instanceof Error)) return String(error);
  if (!(error instanceof TypeError && error.cause instanceof Error)) return error.message;
  const reason = "code" in error.cause ? String(error.cause.code) : error.cause.message;
  return `Pas de réponse de ${apiUrl} : ${reason}`;
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (value === undefined || value === "") {
    console.error(`${name} manquant dans l'environnement.`);
    process.exit(1);
  }
  return value;
}
