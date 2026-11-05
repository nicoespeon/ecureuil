import { execFileSync, spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { after } from "node:test";
import { fileURLToPath } from "node:url";

const HOOK_DIR = dirname(fileURLToPath(import.meta.url));
const CHECKOUT = join(HOOK_DIR, "../..");
const scratchRepos = [];

// Under the pre-commit hook, git exports GIT_DIR and GIT_INDEX_FILE: inherited, they point
// every scratch repo's git command at this checkout, and `git init` makes it bare.
for (const name of Object.keys(process.env).filter((key) => key.startsWith("GIT_"))) {
  delete process.env[name];
}

after(() => {
  for (const repo of scratchRepos) {
    rmSync(repo, { recursive: true, force: true });
  }
});

/** A git repo with this checkout's Biome config: `main` committed, `branch` written on top. */
export function repoWith({ main = {}, branch = {} }) {
  const repo = realpathSync(mkdtempSync(join(tmpdir(), "ecureuil-harness-")));
  scratchRepos.push(repo);
  cpSync(join(CHECKOUT, "biome.json"), join(repo, "biome.json"));
  cpSync(join(CHECKOUT, "biome-plugins"), join(repo, "biome-plugins"), { recursive: true });
  writeFiles(repo, main);
  git(repo, "init", "--quiet", "--initial-branch=main");
  git(repo, "add", ".");
  git(repo, "commit", "--quiet", "--message=main");
  git(repo, "checkout", "--quiet", "-b", "feature");
  writeFiles(repo, branch);
  return repo;
}

/** Runs a hook as Claude Code would in a fresh session, and returns what it hands back. */
export function runHook(hook, repo, toolInput) {
  return sessionIn(repo)(hook, toolInput);
}

/** One Claude Code session in `repo`: hooks called through it share its id. */
export function sessionIn(repo) {
  const session = randomUUID();
  return (hook, { file_path, ...toolInput }) => {
    const { stdout, stderr, status } = spawnSync(process.execPath, [join(HOOK_DIR, hook)], {
      input: JSON.stringify({
        session_id: session,
        cwd: repo,
        tool_input: { file_path: join(repo, file_path), ...toolInput },
      }),
      encoding: "utf8",
    });
    if (status !== 0) {
      throw new Error(`${hook} exited ${status}: ${stderr}`);
    }
    if (stdout === "") {
      return "";
    }
    const { hookSpecificOutput } = JSON.parse(stdout);
    return hookSpecificOutput.additionalContext ?? hookSpecificOutput.permissionDecisionReason;
  };
}

function writeFiles(repo, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(repo, path)), { recursive: true });
    writeFileSync(join(repo, path), content);
  }
}

function git(cwd, ...args) {
  execFileSync(
    "git",
    [
      "-c",
      "user.name=test",
      "-c",
      "user.email=test@example.com",
      "-c",
      "core.hooksPath=/dev/null",
      ...args,
    ],
    { cwd, stdio: "ignore" },
  );
}
