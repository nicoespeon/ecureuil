import { seed } from "@ecureuil/domain";
import { pushJournal } from "./push-seed.ts";

// The dev seed only ever goes to the local API: production holds the foyer's real journal.
const apiUrl = "http://localhost:8787";

const secret = process.env.LIEN_SECRET;
if (secret === undefined || secret === "") {
  console.error("LIEN_SECRET manquant dans l'environnement.");
  process.exit(1);
}

try {
  const { pushed, ignored } = await pushJournal({ apiUrl, secret, fetch, journal: seed });
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
