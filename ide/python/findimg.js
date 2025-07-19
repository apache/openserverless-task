import { readFile } from "fs/promises";

async function main() {
  const [,, runtimeInput, jsonPath] = process.argv;

  if (!runtimeInput || !jsonPath) {
    console.error("Usage: bun find.js <runtime[:version|default]> <runtimes.json>");
    process.exit(1);
  }

  const [language, kindOrDefault] = runtimeInput.split(":");

  const content = await readFile(jsonPath, "utf-8");
  const data = JSON.parse(content);

  const runtimes = data.runtimes?.[language];

  if (!runtimes) {
    console.error(`Runtime family "${language}" not found.`);
    process.exit(1);
  }

  let runtime;

  if (!kindOrDefault || kindOrDefault === "default") {
    runtime = runtimes.find(r => r.default);
  } else {
    runtime = runtimes.find(r => r.kind === `${language}:${kindOrDefault}`);
  }

  if (!runtime || !runtime.image) {
    console.error(`Runtime for "${runtimeInput}" not found or has no image info.`);
    process.exit(1);
  }

  const { prefix, name, tag } = runtime.image;
  console.log(`${prefix}/${name}:${tag}`);
}

main();
