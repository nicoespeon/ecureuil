import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const script = fileURLToPath(new URL("./check-pr-title.mjs", import.meta.url));

const validTitles = [
  "feat: add the catalogue",
  "fix(domain): keep the rayon order",
  "chore(deps): update dependency hono to v4.14.0",
  "docs: carte du domaine, du contrat wire et d'Effect 4",
  "feat(web)!: drop the legacy list",
  "ci: check the PR title",
  "build: bundle the API",
  "perf: fold the journal once",
  "refactor: extract listForMagasin",
  "test: cover SortieFinished",
  "style: format with Biome",
  'revert: "feat: add the catalogue"',
  `feat: ${"a".repeat(94)}`,
];

const invalidTitles = [
  "Add the catalogue",
  "feature: add the catalogue",
  "Feat: add the catalogue",
  "feat:add the catalogue",
  "feat: ",
  "feat:  leading space",
  "feat(): empty scope",
  "feat(Domain): uppercase scope",
  'Revert "feat: add the catalogue"',
  `feat: ${"a".repeat(95)}`,
];

for (const title of validTitles) {
  test(`accepts ${JSON.stringify(title)}`, () => {
    const result = checkTitle(title);

    assert.equal(result.status, 0, result.stderr);
  });
}

for (const title of invalidTitles) {
  test(`rejects ${JSON.stringify(title)}`, () => {
    const result = checkTitle(title);

    assert.equal(result.status, 1, `expected a rejection, got: ${result.stdout}`);
    assert.match(result.stderr, /type\(scope\)\?: subject/);
  });
}

test("rejects a missing title", () => {
  const result = spawnSync(process.execPath, [script], { encoding: "utf8" });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage/);
});

function checkTitle(title) {
  return spawnSync(process.execPath, [script, title], { encoding: "utf8" });
}
