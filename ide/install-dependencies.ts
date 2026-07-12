/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { createHash } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";

const stateFileName = ".ops-bun-install-state";
const dependencyInputs = [
  "package.json",
  "bun.lock",
  "bun.lockb",
  "package-lock.json",
  "pnpm-lock.yaml",
  "yarn.lock",
];

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function dependencyState(projectDir: string): Promise<string> {
  const hash = createHash("sha256");
  hash.update(`bun:${Bun.version}\n`);

  for (const name of dependencyInputs) {
    const path = join(projectDir, name);
    if (await exists(path)) {
      hash.update(`${name}\0`);
      hash.update(await readFile(path));
    }
  }

  return hash.digest("hex");
}

export async function installDependencies(projectPath: string): Promise<boolean> {
  const projectDir = resolve(projectPath);
  const packageJson = join(projectDir, "package.json");
  if (!(await exists(packageJson))) {
    throw new Error(`package.json not found in ${projectDir}`);
  }

  const nodeModules = join(projectDir, "node_modules");
  const stateFile = join(nodeModules, stateFileName);
  const expectedState = await dependencyState(projectDir);

  if (await exists(stateFile)) {
    const installedState = (await readFile(stateFile, "utf8")).trim();
    if (installedState === expectedState) {
      return false;
    }
  }

  await rm(nodeModules, { recursive: true, force: true });
  const cacheDir = await mkdtemp(join(tmpdir(), "openserverless-bun-cache-"));

  try {
    const install = Bun.spawn(
      [
        process.execPath,
        "install",
        "--no-save",
        "--no-cache",
        "--cache-dir",
        cacheDir,
        "--network-concurrency=1",
      ],
      {
        cwd: projectDir,
        env: process.env,
        stdout: "inherit",
        stderr: "inherit",
      },
    );
    const exitCode = await install.exited;
    if (exitCode !== 0) {
      throw new Error(
        `bun install failed with exit code ${exitCode} in ${projectDir}`,
      );
    }

    await mkdir(nodeModules, { recursive: true });
    await writeFile(stateFile, `${expectedState}\n`);
    return true;
  } finally {
    await rm(cacheDir, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  const projectDir = Bun.argv[2];
  if (!projectDir) {
    console.error(`Usage: bun ${basename(Bun.argv[1])} <project-directory>`);
    process.exit(2);
  }

  try {
    await installDependencies(projectDir);
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}
