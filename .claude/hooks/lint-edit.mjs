#!/usr/bin/env node
// PostToolUse on Edit|Write: lints the one file Claude just wrote, so a smell shows up
// before the next edit builds on it. Reports, never fixes: a file rewritten under the
// agent's feet makes its next Edit fail.
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, matchesGlob, relative } from "node:path";
import { fileURLToPath } from "node:url";

const BIN = join(dirname(fileURLToPath(import.meta.url)), "../../node_modules/.bin");
const GUIDES = ".claude/hooks/guides";
const GUIDE_BY_RULE = {
  "lint/style/noNonNullAssertion": "type-assertion",
  "lint/suspicious/noExplicitAny": "type-assertion",
  "lint/style/noNestedTernary": "nested-ternary",
  "lint/complexity/useMaxParams": "too-many-parameters",
  "lint/complexity/noExcessiveCognitiveComplexity": "high-complexity",
  "lint/nursery/noExcessiveNestedBlocks": "deep-nesting",
  "lint/complexity/noExcessiveLinesPerFunction": "oversized-file",
  "lint/style/noExcessiveLinesPerFile": "oversized-file",
};
// Tests repeat their setup on purpose, so each case reads on its own.
const TEST_FILES = ["**/*.test.ts", "**/*.test.tsx", "**/*.test.mjs", "**/*.pw.ts"];

const payload = JSON.parse(readFileSync(0, "utf8"));
const filePath = payload.tool_input?.file_path;
if (!filePath || !existsSync(filePath)) {
  process.exit(0);
}
// The repo the file lives in, not the session's cwd: an agent may have cd'd into a subfolder.
const root = spawnSync("git", ["rev-parse", "--show-toplevel"], {
  cwd: dirname(realpathSync(filePath)),
  encoding: "utf8",
}).stdout.trim();
if (!root || !existsSync(join(root, "biome.json"))) {
  process.exit(0);
}
const file = relative(root, realpathSync(filePath));

const sections = [biomeSection(), duplicationSection()].filter(Boolean);
if (sections.length > 0) {
  process.stdout.write(
    JSON.stringify({
      hookSpecificOutput: {
        hookEventName: "PostToolUse",
        additionalContext: sections.join("\n\n"),
      },
    }),
  );
}

function biomeSection() {
  const { stdout } = spawnSync(
    join(BIN, "biome"),
    [
      "lint",
      "--reporter=json",
      "--files-ignore-unknown=true",
      "--no-errors-on-unmatched",
      "--max-diagnostics=none",
      file,
    ],
    { cwd: root, encoding: "utf8" },
  );
  const problems = JSON.parse(stdout).diagnostics.map(
    ({ category, message, location }) =>
      `${location.path}:${location.start.line}:${location.start.column} ${category} ${message}${pointerFor(category)}`,
  );
  return problems.length === 0
    ? null
    : `Biome found ${problems.length} problem(s) in ${file}. \`pnpm check\` fails on any of them. Fix the code, never silence the rule inline:\n${problems.join("\n")}`;
}

function pointerFor(category) {
  if (category === "plugin") {
    return "";
  }
  const guide = GUIDE_BY_RULE[category];
  if (guide) {
    return ` → read ${GUIDES}/${guide}.md`;
  }
  const rule = category
    .split("/")
    .at(-1)
    .replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
  return ` → read https://biomejs.dev/linter/rules/${rule} before fixing`;
}

/** Advisory only: a clone can be the right call, so it never fails `pnpm check`. */
function duplicationSection() {
  if (TEST_FILES.some((glob) => matchesGlob(file, glob))) {
    return null;
  }
  const base = mergeBase();
  const added = addedLines(base);
  const reported = readReported();
  const clones = allClones()
    .map((clone) => (clone.firstFile.name === file ? clone : swap(clone)))
    .filter(({ firstFile }) => firstFile.name === file && wroteMostOf(firstFile, added))
    .filter(({ fingerprint }) => !reported.includes(fingerprint));
  if (clones.length === 0) {
    return null;
  }
  writeReported([...reported, ...clones.map(({ fingerprint }) => fingerprint)]);
  const lines = clones.map(
    ({ firstFile: own, secondFile: other }) =>
      `${own.name}:${own.start}-${own.end} repeats ${other.name}:${other.start}-${other.end}`,
  );
  return `This edit wrote code that already exists elsewhere. Advisory: read ${GUIDES}/duplicated-code.md, then decide whether it hides a missing concept or is fine as is (say why in your summary):\n${lines.join("\n")}`;
}

function allClones() {
  const output = mkdtempSync(join(tmpdir(), "ecureuil-jscpd-"));
  try {
    spawnSync(
      join(BIN, "jscpd"),
      [
        ".",
        "--silent",
        "--format=typescript,tsx,javascript",
        "--cross-formats=js-ts",
        `--ignore=${TEST_FILES.join(",")}`,
        "--reporters=json",
        `--output=${output}`,
      ],
      { cwd: root },
    );
    const { duplicates } = JSON.parse(readFileSync(join(output, "jscpd-report.json"), "utf8"));
    return duplicates.map((clone) => ({ ...clone, fingerprint: fingerprintOf(clone) }));
  } finally {
    rmSync(output, { recursive: true, force: true });
  }
}

// A clone is this change's doing only when it wrote most of one side. Below that,
// renaming a variable inside a copy that predates the branch would report the copy.
function wroteMostOf({ start, end }, added) {
  const lines = end - start + 1;
  const written =
    added === "all" ? lines : added.filter((line) => line >= start && line <= end).length;
  return written / lines >= 0.5;
}

/** The lines of the edited file that differ from the merge base, or "all" for a new file. */
function addedLines(base) {
  if (git("cat-file", "-e", `${base}:${file}`).status !== 0) {
    return "all";
  }
  const hunks = git("diff", "--no-ext-diff", "-U0", base, "--", file).stdout.matchAll(
    /^@@ .* \+(\d+)(?:,(\d+))? @@/gm,
  );
  return [...hunks].flatMap(([, start, count = "1"]) =>
    Array.from({ length: Number(count) }, (_, offset) => Number(start) + offset),
  );
}

function mergeBase() {
  const hasOriginMain = git("rev-parse", "--verify", "--quiet", "origin/main").status === 0;
  return git("merge-base", "HEAD", hasOriginMain ? "origin/main" : "main").stdout.trim();
}

function git(...args) {
  return spawnSync("git", args, { cwd: root, encoding: "utf8" });
}

function swap({ firstFile, secondFile, ...clone }) {
  return { ...clone, firstFile: secondFile, secondFile: firstFile };
}

function fingerprintOf({ firstFile, secondFile, fragment }) {
  const files = [firstFile.name, secondFile.name].sort().join("|");
  return createHash("sha1")
    .update(`${files}|${fragment.replace(/\s+/g, " ")}`)
    .digest("hex");
}

function reportedPath() {
  return join(tmpdir(), "ecureuil-harness", `${payload.session_id}.json`);
}

function readReported() {
  return existsSync(reportedPath()) ? JSON.parse(readFileSync(reportedPath(), "utf8")) : [];
}

function writeReported(fingerprints) {
  mkdirSync(dirname(reportedPath()), { recursive: true });
  writeFileSync(reportedPath(), JSON.stringify(fingerprints));
}
