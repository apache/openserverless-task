import { $ } from "bun";

const OPS_FILE = "opsfile.yml";

function die(msg: string): never {
  console.error(`ERROR: ${msg}`);
  process.exit(1);
}

async function confirm(prompt: string): Promise<boolean> {
  process.stdout.write(`${prompt} [y/N] `);
  for await (const line of console) {
    return line.trim().toLowerCase() === "y";
  }
  return false;
}

// parse args: <no> <reset> <cmds>...
const args = process.argv.slice(2);
if (args.length < 3) {
  console.log("Provide a command.");
  process.exit(0);
}

const [noArg, resetArg, ...cmds] = args;

// validate booleans
function parseBool(val: string, name: string): boolean {
  if (val === "true") return true;
  if (val === "false") return false;
  die(`Invalid boolean value for <${name}>: '${val}'. Expected 'true' or 'false'.`);
}

const no = parseBool(noArg, "no");
const reset = parseBool(resetArg, "reset");

if (cmds.length < 1) {
  die("At least one <cmd> argument (the task name) is required.");
}

const { existsSync } = await import("fs");
const { join } = await import("path");

// resolve root directory based on first cmd
const firstCmd = cmds[0];
let root: string;
let remainingCmds: string[];

const opsRootPlugin = process.env.OPS_ROOT_PLUGIN ?? "";
const pluginDir = opsRootPlugin ? join(opsRootPlugin, `olaris-${firstCmd}`) : "";

if (pluginDir && existsSync(pluginDir)) {
  // first cmd matches a plugin: olaris-<first> exists
  root = pluginDir;
  remainingCmds = cmds.slice(1);
} else {
  // use OPS_ROOT as root, keep all cmds
  const opsRoot = process.env.OPS_ROOT ?? "";
  if (!opsRoot) {
    die("OPS_ROOT is not set.");
  }
  root = opsRoot;
  remainingCmds = cmds;
}

if (!existsSync(root)) {
  die(`Root directory does not exist: ${root}`);
}

// split remaining cmds: all except last are dir segments, last is task name
if (remainingCmds.length < 1) {
  die("At least one <cmd> argument (the task name) is required.");
}

const dirParts = remainingCmds.slice(0, -1);
const taskName = remainingCmds[remainingCmds.length - 1];

// resolve target directory
const targetDir = dirParts.length > 0 ? join(root, ...dirParts) : root;
if (!existsSync(targetDir)) {
  die(`Target directory does not exist: ${dirParts.join("/")}`);
}

// locate ops file
const opsFilePath = join(targetDir, OPS_FILE);
if (!existsSync(opsFilePath)) {
  die(`Could not find ops file in directory: ${dirParts.join("/")}`);
}

// check yq is available
try {
  await $`which yq`.quiet();
} catch {
  die("yq is not available in PATH.");
}

if (reset) {
  // reset flow
  const ok = await confirm("Restore ops file from Git?");
  if (ok) {
    // find the git repo root containing the file (handles submodules)
    const repoRoot = (
      await $`git -C ${targetDir} rev-parse --show-toplevel`.quiet()
    )
      .text()
      .trim();
    const { relative } = await import("path");
    const relPath = relative(repoRoot, opsFilePath);
    await $`git -C ${repoRoot} checkout -- ${relPath}`;
    console.log(`Restored ${opsFilePath} from Git.`);
  } else {
    console.log("Reset cancelled.");
  }
} else {
  // verify task exists
  const taskCheck =
    await $`yq -e ".tasks.${taskName}" ${opsFilePath}`.quiet().nothrow();
  if (taskCheck.exitCode !== 0) {
    die(`Task '${taskName}' not found in ops file.`);
  }

  // update silent value
  const silentValue = no ? "true" : "false";
  await $`yq -i '.tasks.${taskName}.silent = ${silentValue}' ${opsFilePath}`;
  console.log(`Set tasks.${taskName}.silent = ${silentValue} in ${opsFilePath}`);
}
