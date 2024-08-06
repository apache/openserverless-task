import { $ } from "bun";

import {
  intro,
  outro,
  select,
  isCancel,
  cancel,
  text,
  password,
} from "@clack/prompts";
import color from "picocolors";

import { parseArgs } from "util";

type Prompts = Record<string, PromptData>;

type PromptData = {
  type: string | string[];
  value?: string;
};

const OPS_CMD = process.env.OPS_CMD || "ops";

export const AdditionalArgsMsg = "Additional arguments will be ignored.";
export const NotValidJsonMsg = "Not a valid JSON file";
export const BadConfigMsg = `Bad configuration file. 

The configuration file must be an non-empty JSON with the following structure:
    
{
  "KEY": {
    type: "string"
  },
  "OTHER_KEY": {
    type: "int"
  },
  ...
} 

The keys must be uppercase words (separated by underscores).
The value for the "type" key must be either string with the following values:
- string
- int
- float
- bool
- password

or an array of strings with specific values (an enum).
`;

export const HelpMsg = `
Usage: config <configjson>

Description:
Prompt the user for configuration data defined in the config.json file. 
From the input config, the script will remove the keys that are already set in ops,
and only prompt the user for the missing data. Then they will be saved in the ops config.

The config.json file must be a JSON file with the following structure:
      
  {
    "KEY": {
      type: "string"
    },
    "OTHER_KEY": {
      type: "int"
    },
    ...
  }

The keys must be uppercase words (separated by underscores).
The value for the "type" key must be either string with the following values:
- string
- int
- float
- bool
- password

or an array of strings with specific values (an enum).`;

async function main() {
  const { positionals } = parseArgs({
    args: Bun.argv,
    strict: true,
    allowPositionals: true,
  });

  // 1. Read input config json
  const readPosRes = readPositionalFile(positionals);
  if (!readPosRes.success) {
    cancel(readPosRes.message);
    return process.exit(1);
  }

  if (readPosRes.help) {
    console.log(readPosRes.help);
    return process.exit(0);
  }

  if (readPosRes.message) {
    console.warn(readPosRes.message);
  }

  // 2. Parse the json
  const jsonRes = await parsePositionalFile(readPosRes.jsonFilePath!);

  if (!jsonRes.success) {
    cancel(jsonRes.message);
    return process.exit(1);
  }

  const config = jsonRes.body;

  // 3. Validate the given config json
  const validationRes = validateConfigJson(config);
  if (!validationRes.success) {
    cancel(validationRes.message);
    return process.exit(1);
  }

  // 4. Run OPS_CMD to get the available config data
  // TODO if I add .quiet() to avoid printing stdout, the script crashes. Bun bug?
  const { exitCode, stderr, stdout } = await $`${OPS_CMD} -config -d`.nothrow();
  if (exitCode !== 0) {
    cancel(stderr.toString());
    return process.exit(1);
  }

  const opsConfig = stdout.toString();

  // 5. Remove the keys from config that are already in the opsConfig
  const missingData = findMissingConfig(config, opsConfig);

  // 6. Ask the user for the missing data
  console.log();
  intro(color.inverse(" ops configurator "));

  const inputConfigs = await askMissingData(missingData);

  // 7. Save the data to the config?
  console.log();

  // Build the string "KEY=VALUE KEY=VALUE ..." from the inputConfigs
  const configStr = Object.entries(inputConfigs)
    .map(([key, value]) => `${key}="${value.value}"`)
    .join(" ");

  await $`${OPS_CMD} -config ${configStr}`;

  outro("You're all set!");
}

async function askMissingData(missingData: Prompts): Promise<Prompts> {
  if (Object.keys(missingData).length === 0) {
    outro("Configuration set from ops");
    process.exit(0);
  }
  console.log();
  console.log("Configuration partially set from ops. Need a few more:");

  const inputConfigs: Prompts = {};

  for (const key in missingData) {
    const prompt: PromptData = missingData[key];

    if (Array.isArray(prompt.type)) {
      const selected = await select({
        message: `Pick a value for '${key}'`,
        options: prompt.type.map((v) => ({ label: v, value: v })),
      });

      if (!selected) {
        cancel("Operation cancelled");
        process.exit(0);
      }

      inputConfigs[key] = { ...prompt, value: selected.toString() };
    } else if (prompt.type === "bool") {
      const selected = await select({
        message: `Pick a true/false for '${key}'`,
        options: [
          { label: "true", value: "true" },
          { label: "false", value: "false" },
        ],
      });

      if (!selected) {
        cancel("Operation cancelled");
        process.exit(0);
      }

      inputConfigs[key] = { ...prompt, value: selected.toString() };
    } else if (prompt.type === "password") {
      const input = await password({
        message: `Enter password value for ${key}`,
      });

      if (isCancel(input)) {
        cancel("Operation cancelled");
        process.exit(0);
      }

      inputConfigs[key] = { ...prompt, value: input };
    } else {
      const input = await text({
        message: `Enter value for ${key} (${prompt.type})`,
      });

      if (isCancel(input)) {
        cancel("Operation cancelled");
        process.exit(0);
      }

      switch (prompt.type) {
        case "int":
          if (!Number.isInteger(Number(input))) {
            cancel(`Value for ${key} must be an integer`);
            process.exit(1);
          }
          break;
        case "float":
          if (!Number(input)) {
            cancel(`Value for ${key} must be a float`);
            process.exit(1);
          }
          break;
      }

      inputConfigs[key] = { ...prompt, value: input };
    }
  }

  return inputConfigs;
}

export function findMissingConfig(
  config: Record<string, any>,
  opsConfig: string
): Prompts {
  let newConfig: Record<string, any> = {};

  let opsConfigKeys = opsConfig.split("\n").map((line) => line.split("=")[0]);

  for (const key in config) {
    if (opsConfigKeys.includes(key)) {
      continue;
    }
    newConfig[key] = config[key];
  }

  return newConfig;
}

export function readPositionalFile(positionals: string[]): {
  success: boolean;
  message?: string;
  help?: string;
  jsonFilePath?: string;
} {
  if (positionals.length < 2) {
    console.error("This should not happen");
    return { success: false, message: "This should not happen" };
  }

  if (positionals.length === 2) {
    return { success: true, help: HelpMsg };
  }

  if (positionals.length > 3) {
    return {
      success: true,
      message: AdditionalArgsMsg,
      jsonFilePath: positionals[2],
    };
  }

  return { success: true, jsonFilePath: positionals[2] };
}

export async function parsePositionalFile(
  path: string
): Promise<{ success: boolean; message?: string; body?: any }> {
  const file = Bun.file(Bun.pathToFileURL(path));

  try {
    const contents = await file.json();
    return { success: true, body: contents };
  } catch (error) {
    return { success: false, message: NotValidJsonMsg };
  }
}

export function validateConfigJson(body: Record<string, any>): {
  success: boolean;
  message?: string;
} {
  // 1. If the body is empty, return false
  if (Object.keys(body).length === 0) {
    return { success: false, message: BadConfigMsg };
  }

  // 2. Check that each key in the body has the keys as the Prompt type
  for (const key in body) {
    const value = body[key];
    if (typeof value !== "object") {
      return { success: false, message: BadConfigMsg };
    }

    if (!value.type) {
      return { success: false, message: BadConfigMsg };
    }

    if (
      !["string", "int", "float", "bool", "password"].includes(value.type) &&
      !Array.isArray(value.type)
    ) {
      return { success: false, message: BadConfigMsg };
    }
  }

  // 3. Check that all the keys are uppercase and can only have underscores not at the beginning or end
  for (const key in body) {
    if (!/^[A-Z][A-Z_]*[A-Z]$/.test(key)) {
      return { success: false, message: BadConfigMsg };
    }
  }

  return { success: true };
}

main().catch(console.error);
