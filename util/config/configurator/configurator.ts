import {
  intro,
  outro,
  cancel,
} from "@clack/prompts";

import { styleText } from "node:util";

import { ConfigParser } from "./config-parser";
import { ConfigValidator } from "./config-validator";
import { EditLoop } from "./edit-loop";
import { PartialConfigManager } from "./partial-config-manager";

type Prompts = Record<string, PromptData>;

type PromptData = {
  label?: string;
  type: string | string[];
  default?: string;
  value?: string;
};

export const AdditionalArgsMsg = "Additional arguments will be ignored.";

export const HelpMsg = `
Usage: config [-h | --help]

Description:
Interactive configuration editor for ops configuration.
The tool loads configuration from all-config-parameters.toml and provides
an intuitive interface for editing parameters across all components.

Features:
- Select components to configure
- Edit individual parameters
- Auto-save to .tmp file
- Resume editing after interruptions
`;

export default async function main() {
  if (Bun.argv.includes('-h') || Bun.argv.includes('--help')) {
    console.log(HelpMsg);
    return process.exit(0);
  }

  // Load and parse the TOML configuration file using OOP ConfigParser
  const filePath = './all-config-parameters.toml';

  // Create parser instance and load configuration from TOML file
  const parser = new ConfigParser(filePath);
  const loadResult = await parser.load();

  if (!loadResult.success) {
    cancel(loadResult.error || 'Failed to load configuration');
    return process.exit(1);
  }

  const config = loadResult.data!;

  // Validate configuration using OOP ConfigValidator
  // Checks component names and parameter key conventions
  const validator = new ConfigValidator(config);
  const validationResult = validator.validate();

  if (!validationResult.success) {
    console.error('Configuration validation errors:');
    validationResult.errors.forEach(err => console.error(`  - ${err}`));
    cancel('Invalid configuration file');
    return process.exit(1);
  }

  // Create PartialConfigManager and EditLoop for interactive editing
  const configManager = new PartialConfigManager(filePath);
  
  const loadPartialResult = await configManager.load();
  if (!loadPartialResult.success) {
    cancel(loadPartialResult.error || 'Failed to load partial configuration');
    return process.exit(1);
  }

  intro(styleText("inverse", " ops configurator "));

  const editLoop = new EditLoop(configManager);
  const editResult = await editLoop.start();

  if (!editResult.success) {
    cancel(editResult.error || 'Configuration editing failed');
    return process.exit(1);
  }

  console.log();
  outro("You're all set!");
  return process.exit(0);
}

export function findMissingConfig(
  config: Record<string, any>,
  opsCurrentConfig: string
): Prompts {
  let newConfig: Record<string, any> = {};

  let opsConfigKeys = opsCurrentConfig.split("\n").map((line) => line.split("=")[0]);

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

export function isInputConfigValid(body: Record<string, any>): boolean {
  if (Object.keys(body).length === 0) {
    return false;
  }

  for (const key in body) {
    const value = body[key];
    if (typeof value !== "object") {
      return false;
    }

    if (!value.type) {
      return false;
    }

    if (
      !["string", "int", "float", "bool", "password"].includes(value.type) &&
      !Array.isArray(value.type)
    ) {
      return false;
    }
  }

  for (const key in body) {
    if (!/^[A-Z][A-Z_]|[0-9]*[A-Z]|[0-9]$/.test(key)) {
      return false;
    }
  }

  return true;
}
