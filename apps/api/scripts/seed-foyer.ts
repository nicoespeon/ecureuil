import { readFile } from "node:fs/promises";
import { foyerEvents } from "./liste-foyer.ts";
import { runPush } from "./push-cli.ts";

await runPush(async (listePath) => {
  if (listePath === undefined) {
    console.error(
      "Usage : LIEN_SECRET=<secret> pnpm --filter api seed:foyer <liste.txt> [--remote]",
    );
    process.exit(1);
  }
  return foyerEvents(await readFile(listePath, "utf8"));
});
