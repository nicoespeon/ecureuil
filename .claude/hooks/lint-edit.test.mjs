import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { repoWith, runHook, sessionIn } from "./test-support.mjs";

const HOOK = "lint-edit.mjs";

const smells = [
  {
    smell: "a switch",
    file: "src/kind.ts",
    code: `export function label(n: number) {
  switch (n) {
    case 1:
      return "one";
    default:
      return "many";
  }
}
`,
    report: /src\/kind\.ts:2:3 plugin .*guides\/switch\.md/,
  },
  {
    smell: "a type assertion",
    file: "src/cast.ts",
    code: "export const asText = (value: unknown) => value as string;\n",
    report: /src\/cast\.ts:1:43 plugin .*guides\/type-assertion\.md/,
  },
  {
    smell: "an angle-bracket type assertion",
    file: "src/cast.ts",
    code: "export const asText = (value: unknown) => <string>value;\n",
    report: /src\/cast\.ts:1:43 plugin .*guides\/type-assertion\.md/,
  },
  {
    smell: "a non-null assertion",
    file: "src/bang.ts",
    code: "export const size = (value: string | undefined) => value!.length;\n",
    report: /lint\/style\/noNonNullAssertion .*guides\/type-assertion\.md/,
  },
  {
    smell: "an explicit any",
    file: "src/any.ts",
    code: "export const same = (value: any) => value;\n",
    report: /lint\/suspicious\/noExplicitAny .*guides\/type-assertion\.md/,
  },
  {
    smell: "a mock of a module of the repo",
    file: "src/journal.test.ts",
    code: `import { vi } from "vitest";

vi.mock("./journal");
`,
    report: /src\/journal\.test\.ts:3:1 plugin .*guides\/mocked-owned-module\.md/,
  },
  {
    smell: "a mock of a workspace package",
    file: "src/journal.test.ts",
    code: `import { vi } from "vitest";

vi.mock("@ecureuil/domain");
`,
    report: /plugin .*guides\/mocked-owned-module\.md/,
  },
  {
    smell: "a nested ternary",
    file: "src/size.ts",
    code: 'export const size = (n: number) => (n > 10 ? "big" : n > 0 ? "small" : "none");\n',
    report: /lint\/style\/noNestedTernary .*guides\/nested-ternary\.md/,
  },
  {
    smell: "four parameters",
    file: "src/sum.ts",
    code: "export const sum = (a: number, b: number, c: number, d: number) => a + b + c + d;\n",
    report: /lint\/complexity\/useMaxParams .*guides\/too-many-parameters\.md/,
  },
  {
    smell: "a tangled function",
    file: "src/score.ts",
    code: `export function score(values: number[]) {
  let total = 0;
  for (const value of values) {
    if (value > 0 && value < 1000) {
      if (value > 10 || value === -1) {
        total += value > 100 ? value : -value;
      } else if (value === 5) {
        total -= value;
      }
    }
  }
  return total;
}
`,
    report: /lint\/complexity\/noExcessiveCognitiveComplexity .*guides\/high-complexity\.md/,
  },
  {
    smell: "deeply nested blocks",
    file: "src/deep.ts",
    code: `export function deep(a: boolean, b: boolean, c: boolean, d: boolean) {
  if (a) {
    if (b) {
      if (c) {
        if (d) {
          return 1;
        }
      }
    }
  }
  return 0;
}
`,
    report: /lint\/nursery\/noExcessiveNestedBlocks .*guides\/deep-nesting\.md/,
  },
  {
    smell: "a long function",
    file: "src/long.ts",
    code: `export function long() {\n${"  console.info(1);\n".repeat(51)}}\n`,
    report: /lint\/complexity\/noExcessiveLinesPerFunction .*guides\/oversized-file\.md/,
  },
  {
    smell: "a long file",
    file: "src/long.ts",
    code: Array.from({ length: 301 }, (_, i) => `export const value${i} = ${i};\n`).join(""),
    report: /lint\/style\/noExcessiveLinesPerFile .*guides\/oversized-file\.md/,
  },
  {
    smell: "a long test file",
    file: "src/long.test.ts",
    code: Array.from({ length: 501 }, (_, i) => `export const value${i} = ${i};\n`).join(""),
    report: /lint\/style\/noExcessiveLinesPerFile .*guides\/oversized-file\.md/,
  },
  {
    smell: "a hand-written tagged value",
    file: "src/tag.ts",
    code: 'export const pending = { _tag: "Pending" };\n',
    report: /plugin .*guides\/tag-literal\.md/,
  },
  {
    smell: "a rule with no guide of ours",
    file: "src/shape.ts",
    code: "export interface Shape {\n  size: number;\n}\n",
    report:
      /lint\/style\/useConsistentTypeDefinitions .*https:\/\/biomejs\.dev\/linter\/rules\/use-consistent-type-definitions/,
  },
];

describe("lint-edit reports what Biome finds in the edited file", () => {
  for (const { smell, file, code, report } of smells) {
    test(smell, () => {
      const repo = repoWith({ branch: { [file]: code } });

      assert.match(runHook(HOOK, repo, { file_path: file }), report);
    });
  }
});

const acceptable = [
  {
    case: "a clean module",
    file: "src/clean.ts",
    code: "export const double = (n: number) => n * 2;\n",
  },
  {
    case: "an as const",
    file: "src/roles.ts",
    code: 'export const roles = ["proprietaire", "invite"] as const;\n',
  },
  {
    case: "an as const over several lines",
    file: "src/roles.ts",
    code: `export const roles = [
  "proprietaire",
  "invite",
] as const;
`,
  },
  {
    case: "a mock of a third-party module",
    file: "src/clock.test.ts",
    code: 'import { vi } from "vitest";\n\nvi.mock("effect");\n',
  },
  {
    case: "four parameters in a test, from an it.each table",
    file: "src/sum.test.ts",
    code: "export const sum = (a: number, b: number, c: number, d: number) => a + b + c + d;\n",
  },
  {
    case: "a long describe in a test",
    file: "src/long.test.ts",
    code: `export function long() {\n${"  console.info(1);\n".repeat(51)}}\n`,
  },
  {
    case: "a default export in a config file",
    file: "vite.config.ts",
    code: "export default { root: '.' };\n",
  },
  {
    case: "an interface in a declaration file, for declaration merging",
    file: "src/env.d.ts",
    code: "declare namespace Cloudflare {\n  interface Env {\n    DB: string;\n  }\n}\n",
  },
  {
    case: "a file Biome does not lint",
    file: "notes.md",
    code: "# Notes\n\nvalue as string\n",
  },
];

describe("lint-edit stays quiet", () => {
  for (const { case: name, file, code } of acceptable) {
    test(name, () => {
      const repo = repoWith({ branch: { [file]: code } });

      assert.equal(runHook(HOOK, repo, { file_path: file }), "");
    });
  }
});

describe("lint-edit reports a clone the edit wrote", () => {
  test("of code that exists on main", () => {
    const repo = repoWith({
      main: { "src/orders.ts": totalsBy("orders") },
      branch: { "src/refunds.ts": totalsBy("refunds") },
    });

    assert.match(
      runHook(HOOK, repo, { file_path: "src/refunds.ts" }),
      /guides\/duplicated-code\.md.*\nsrc\/refunds\.ts:\d+-\d+ repeats src\/orders\.ts:\d+-\d+/s,
    );
  });

  test("once per session", () => {
    const repo = repoWith({
      main: { "src/orders.ts": totalsBy("orders") },
      branch: { "src/refunds.ts": totalsBy("refunds") },
    });
    const run = sessionIn(repo);
    run(HOOK, { file_path: "src/refunds.ts" });

    assert.equal(run(HOOK, { file_path: "src/refunds.ts" }), "");
  });

  test("but not a copy that main already had", () => {
    const repo = repoWith({
      main: { "src/orders.ts": totalsBy("orders"), "src/refunds.ts": totalsBy("refunds") },
      branch: {
        "src/refunds.ts": totalsBy("refunds").replaceAll("rounded", "roundedToCents"),
      },
    });

    assert.doesNotMatch(runHook(HOOK, repo, { file_path: "src/refunds.ts" }), /duplicated-code/);
  });

  test("but not in a test file", () => {
    const repo = repoWith({
      main: { "src/orders.ts": totalsBy("orders") },
      branch: { "src/refunds.test.ts": totalsBy("refunds") },
    });

    assert.doesNotMatch(
      runHook(HOOK, repo, { file_path: "src/refunds.test.ts" }),
      /duplicated-code/,
    );
  });
});

function totalsBy(kind) {
  return `type Line = { amount: number; currency: string; taxRate: number };

export function ${kind}Total(lines: Line[], currency: string) {
  const matching = lines.filter((line) => line.currency === currency);
  const net = matching.reduce((sum, line) => sum + line.amount, 0);
  const tax = matching.reduce((sum, line) => sum + line.amount * line.taxRate, 0);
  const gross = net + tax;
  const rounded = Math.round(gross * 100) / 100;
  if (rounded < 0) {
    throw new Error(\`Negative total for \${currency}: \${rounded}\`);
  }
  return { currency, net, tax, gross: rounded, count: matching.length };
}
`;
}
