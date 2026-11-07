import { seed } from "@ecureuil/domain";
import { runPush } from "./push-cli.ts";

await runPush(async () => seed);
