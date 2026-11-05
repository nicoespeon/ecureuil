import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import { test } from "node:test";

import { repoWith, runHook } from "./test-support.mjs";

test("scratch repos ignore the GIT_DIR a pre-commit hook exports", (t) => {
  const checkout = repoWith({});
  t.after(() => {
    delete process.env.GIT_DIR;
  });
  process.env.GIT_DIR = join(checkout, ".git");

  assert.doesNotThrow(() => {
    const repo = repoWith({ branch: { "src/clean.ts": "export const one = 1;\n" } });
    runHook("lint-edit.mjs", repo, { file_path: "src/clean.ts" });
  });
  assert.equal(bareSetting(checkout), "false");
});

function bareSetting(repo) {
  return execFileSync("git", ["config", "--get", "core.bare"], {
    cwd: repo,
    encoding: "utf8",
    env: {},
  }).trim();
}
