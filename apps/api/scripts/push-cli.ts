import { parseArgs } from "node:util";
import type { Event } from "@ecureuil/wire";
import { pushJournal } from "./push-seed.ts";

/**
 * The command line shared by `seed` and `seed:foyer`: `--remote` targets `API_URL`, the secret
 * comes from `LIEN_SECRET`, and the journal built from the first positional argument is pushed.
 */
export async function runPush(
  journal: (positional: string | undefined) => Promise<ReadonlyArray<Event>>,
) {
  const { values: options, positionals } = parseArgs({
    options: { remote: { type: "boolean", default: false } },
    allowPositionals: true,
  });
  const apiUrl = options.remote ? requiredEnv("API_URL") : "http://localhost:8787";

  try {
    const { pushed, ignored } = await pushJournal({
      apiUrl,
      secret: requiredEnv("LIEN_SECRET"),
      fetch,
      journal: await journal(positionals[0]),
    });
    console.log(`${pushed} événements envoyés à ${apiUrl}`);
    for (const { type } of ignored) console.log(`1 événement invite ignoré (${type})`);
  } catch (error) {
    console.error(describe(error, apiUrl));
    process.exit(1);
  }
}

/** fetch only says "fetch failed"; the network reason (ECONNREFUSED, ENOTFOUND…) is in its cause. */
function describe(error: unknown, apiUrl: string) {
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
