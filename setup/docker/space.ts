import { platform } from "node:os";
import { normalize, sep } from "node:path";

async function getDiskSpaceBytes(path?: string): Promise<{ free: number; size: number }> {
  if (platform() === "win32") {
    path = path ?? "C:\\";
    if (path.charAt(1) !== ":") throw new Error(`Invalid Windows path: ${path}`);

    const proc = Bun.spawn(["wmic", "logicaldisk", "get", "size,freespace,caption"], {
      stdout: "pipe",
    });
    const stdout = await new Response(proc.stdout).text();
    const lines = stdout.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const row = lines.slice(1).find(l => l.toUpperCase().startsWith(path!.charAt(0).toUpperCase()));
    if (!row) throw new Error(`Drive not found for path: ${path}`);
    const cols = row.split(/\s+/);
    return { free: parseInt(cols[1], 10), size: parseInt(cols[2], 10) };
  }

  // Unix / macOS
  path = path ?? "/";
  if (!normalize(path).startsWith(sep)) throw new Error(`Invalid path: ${path}`);

  const proc = Bun.spawn(["df", "-Pk", "--", path], { stdout: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const lines = stdout.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const row = lines[1];
  if (!row) throw new Error("No output from df");
  const cols = row.split(/\s+/);
  return { free: parseInt(cols[3], 10) * 1024, size: parseInt(cols[1], 10) * 1024 };
}

const GB = 1024 ** 3;
if (!Bun.env.REQUIRED_SPACE) {
  console.error("Error: REQUIRED_SPACE environment variable is not defined.");
  process.exit(1);
}
const REQUIRED_SPACE = parseInt(Bun.env.REQUIRED_SPACE, 10);

const { free } = await getDiskSpaceBytes();
const freeGB = Math.round((free / GB) * 100) / 100;

console.log(`Checking disk space, required: ${REQUIRED_SPACE}GB, available: ${freeGB}GB`);
if (freeGB < REQUIRED_SPACE) {
  console.log(`Not enough free disk space (${freeGB}/${REQUIRED_SPACE}GB.)`);
  process.exit(1);
}
process.exit(0);
