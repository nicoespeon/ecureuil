// The PR title becomes the squash commit on `main`, so it must be a conventional commit.
// Plain Node, no dependency: CI runs it before any install.

const types = [
  "feat",
  "fix",
  "chore",
  "docs",
  "refactor",
  "test",
  "ci",
  "build",
  "perf",
  "style",
  "revert",
];
const conventionalTitle = new RegExp(`^(${types.join("|")})(\\([a-z0-9-]+\\))?!?: \\S`);
/** GitHub appends " (#123)" on squash; 100 leaves room for Renovate's long dependency names. */
const maxLength = 100;

const title = process.argv[2];

if (title === undefined) {
  fail("Usage: check-pr-title.mjs <title>");
} else if (!conventionalTitle.test(title)) {
  fail(`"${title}" is not a conventional commit.`);
} else if ([...title].length > maxLength) {
  fail(`"${title}" is longer than ${maxLength} characters.`);
} else {
  console.log(`PR title OK: ${title}`);
}

function fail(reason) {
  console.error(
    [
      reason,
      "Expected: type(scope)?: subject",
      `  type: ${types.join(", ")}`,
      "  scope: optional, lowercase (e.g. domain, web, deps)",
      "  subject: French or English",
    ].join("\n"),
  );
  process.exit(1);
}
