import { readFile } from "node:fs/promises";
import path from "node:path";
import { foyerEvents } from "./liste-foyer.ts";
import { runPush } from "./push-cli.ts";

await runPush(
  async (listePath) => {
    if (listePath === undefined) {
      console.error(
        "Usage : LIEN_SECRET=<secret> pnpm --filter api seed:foyer <liste.txt> [--remote]",
      );
      process.exit(1);
    }
    // pnpm --filter runs from apps/api; INIT_CWD is where the command was typed.
    const resolved = path.resolve(process.env.INIT_CWD ?? process.cwd(), listePath);
    return foyerEvents(await readFile(resolved, "utf8"));
  },
  { onlyIfEmpty: true },
);
