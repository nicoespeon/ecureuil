import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, test } from "node:test";

import { repoWith, runHook } from "./test-support.mjs";

const HOOK = "no-inline-suppression.mjs";

// Built from parts so this file never holds the comments it hunts for.
const suppressions = [
  ["//", "biome-ignore lint/style/noNonNullAssertion: always set"],
  ["//", "biome-ignore-all lint: generated"],
  ["/*", "biome-ignore lint/suspicious/noExplicitAny: legacy */"],
  ["//", "@ts-expect-error the types are wrong"],
  ["//", "@ts-ignore"],
  ["//", "@ts-nocheck"],
  ["/*", "eslint-disable */"],
].map(([opener, directive]) => `${opener} ${directive}`);

describe("before an edit, no-inline-suppression denies", () => {
  for (const suppression of suppressions) {
    test(suppression, () => {
      const repo = repoWith({});

      assert.match(
        runHook(HOOK, repo, {
          file_path: "src/cast.ts",
          old_string: "const size = value.length;",
          new_string: `${suppression}\nconst size = value!.length;`,
        }),
        /guides\/inline-suppression\.md/,
      );
    });
  }

  test("a file written whole with one", () => {
    const repo = repoWith({});

    assert.match(
      runHook(HOOK, repo, {
        file_path: "src/cast.ts",
        content: `${suppressions[0]}\nexport const size = (value?: string) => value!.length;\n`,
      }),
      /guides\/inline-suppression\.md/,
    );
  });
});

describe("before an edit, no-inline-suppression lets through", () => {
  test("code without suppression", () => {
    const repo = repoWith({});

    assert.equal(
      runHook(HOOK, repo, { file_path: "src/cast.ts", new_string: "const size = value?.length;" }),
      "",
    );
  });

  test("prose that names a suppression", () => {
    const repo = repoWith({});

    assert.equal(
      runHook(HOOK, repo, {
        file_path: "guides/inline-suppression.md",
        content: `Never write \`${suppressions[0]}\`.\n`,
      }),
      "",
    );
  });
});

describe("in pnpm check, no-inline-suppression", () => {
  test("fails on a file that holds one, tracked or not", () => {
    const repo = repoWith({
      main: { "src/clean.ts": "export const one = 1;\n" },
      branch: {
        "src/cast.ts": `export const one = 1;\n${suppressions[3]}\nexport const two: string = 2;\n`,
      },
    });

    const { status, stderr } = scan(repo);

    assert.equal(status, 1);
    assert.match(stderr, /guides\/inline-suppression\.md.*\nsrc\/cast\.ts:2: /s);
  });

  test("passes on a repo without any", () => {
    const repo = repoWith({
      main: { "src/clean.ts": "export const one = 1;\n" },
      branch: { "README.md": `Never write \`${suppressions[3]}\`.\n` },
    });

    assert.equal(scan(repo).status, 0);
  });
});

function scan(repo) {
  return spawnSync(process.execPath, [join(import.meta.dirname, HOOK), "--all"], {
    cwd: repo,
    encoding: "utf8",
  });
}
