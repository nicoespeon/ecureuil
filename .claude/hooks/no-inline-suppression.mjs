#!/usr/bin/env node
// A comment that silences Biome or TypeScript hides the smell instead of fixing it.
// PreToolUse on Edit|Write: denies the edit that would add one.
// `--all`, in `pnpm check`: fails on any tracked or untracked file that holds one.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";

const SUPPRESSION =
  /(?:\/\/|\/\*)\s*(?:biome-ignore|@ts-expect-error|@ts-ignore|@ts-nocheck|eslint-disable)/;
const CODE = new Set([
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".json",
  ".jsonc",
  ".css",
]);
const ADVICE =
  "Fix the code, never silence the rule inline; if the rule itself is wrong, change it in biome.json in a dedicated PR. See .claude/hooks/guides/inline-suppression.md.";

if (process.argv.includes("--all")) {
  scanRepo();
} else {
  guardEdit();
}

function guardEdit() {
  const { tool_input: input = {} } = JSON.parse(readFileSync(0, "utf8"));
  const written = [
    input.content,
    input.new_string,
    ...(input.edits ?? []).map(({ new_string }) => new_string),
  ];
  if (
    !CODE.has(extname(input.file_path ?? "")) ||
    !written.some((text) => SUPPRESSION.test(text ?? ""))
  ) {
    return;
  }
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: `This edit adds an inline suppression comment. ${ADVICE}`,
      },
    }),
  );
}

function scanRepo() {
  const files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
    encoding: "utf8",
  })
    .split("\n")
    .filter((file) => CODE.has(extname(file)) && existsSync(file));
  const found = files.flatMap((file) =>
    readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, index) =>
        SUPPRESSION.test(line) ? [`${file}:${index + 1}: ${line.trim()}`] : [],
      ),
  );
  if (found.length > 0) {
    process.stderr.write(`Inline suppression comments found. ${ADVICE}\n${found.join("\n")}\n`);
    process.exitCode = 1;
  }
}
