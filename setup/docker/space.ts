import { cpus, platform, totalmem } from "node:os";

const GB = 1024 ** 3;

function requireEnv(name: string): number {
  const val = Bun.env[name];
  if (!val) {
    console.error(`Error: ${name} environment variable is not defined.`);
    process.exit(1);
  }
  return parseInt(val, 10);
}

const REQUIRED_CPU = requireEnv("REQUIRED_CPU");
const REQUIRED_MEM = requireEnv("REQUIRED_MEM");
const REQUIRED_DISK = requireEnv("REQUIRED_DISK");

// Check CPU
const availableCpus = cpus().length;
console.log(`Checking CPUs, required: ${REQUIRED_CPU}, available: ${availableCpus}`);
if (availableCpus < REQUIRED_CPU) {
  console.error(`Not enough CPUs (available: ${availableCpus}, required: ${REQUIRED_CPU})`);
  process.exit(1);
}

// Check memory
const totalMemGB = Math.round((totalmem() / GB) * 100) / 100;
console.log(`Checking memory, required: ${REQUIRED_MEM}GB, available: ${totalMemGB}GB`);
if (totalMemGB < REQUIRED_MEM) {
  console.error(`Not enough memory (available: ${totalMemGB}GB, required: ${REQUIRED_MEM}GB)`);
  process.exit(1);
}

// Check disk space
async function getFreeDiskGB(): Promise<number> {
  if (platform() === "win32") {
    const proc = Bun.spawn(
      ["powershell", "-Command", "(Get-PSDrive C).Free"],
      { stdout: "pipe" }
    );
    const stdout = await new Response(proc.stdout).text();
    const bytes = parseInt(stdout.trim(), 10);
    if (isNaN(bytes)) throw new Error("Failed to read disk space on Windows");
    return bytes / GB;
  }

  // macOS: df does not support --
  if (platform() === "darwin") {
    const proc = Bun.spawn(["df", "-Pk", "/"], { stdout: "pipe" });
    const stdout = await new Response(proc.stdout).text();
    const lines = stdout.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    const row = lines[1];
    if (!row) throw new Error("No output from df");
    const cols = row.split(/\s+/);
    return (parseInt(cols[3], 10) * 1024) / GB;
  }

  // Linux
  const proc = Bun.spawn(["df", "-Pk", "--", "/"], { stdout: "pipe" });
  const stdout = await new Response(proc.stdout).text();
  const lines = stdout.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  const row = lines[1];
  if (!row) throw new Error("No output from df");
  const cols = row.split(/\s+/);
  return (parseInt(cols[3], 10) * 1024) / GB;
}

const freeGB = Math.round((await getFreeDiskGB()) * 100) / 100;
console.log(`Checking disk space, required: ${REQUIRED_DISK}GB, available: ${freeGB}GB`);
if (freeGB < REQUIRED_DISK) {
  console.error(`Not enough free disk space (available: ${freeGB}GB, required: ${REQUIRED_DISK}GB)`);
  process.exit(1);
}

process.exit(0);
