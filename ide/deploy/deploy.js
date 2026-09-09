// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

import fs from "fs/promises";
import path from "path";
import { expandEnv } from "./env_utils";
import { getBuiltImageTag, buildImage, getRuntimeImage } from "./builder.js";
import { addActionToDeployInfo } from "./syncDeployInfo.js";
const { parse } = await import("shell-quote");

/**
 * Get the registry host for custom images
 * @returns {string} - Registry host
 */
function getRegistryHost() {
  return "127.0.0.1:32000";
}

const MAINS = ["__main__.py", "index.js", "index.php", "main.go", "Main.java"];

const queue = [];
const activeDeployments = new Map();

let dryRun = false;

export function setDryRun(b) {
  dryRun = b;
}

async function exec(cmd) {
  console.log("$", cmd);
  cmd = expandEnv(cmd);
  const cmdArgs = parse(cmd).filter((arg) => typeof arg === "string");

  const proc = Bun.spawn(cmdArgs, {
    shell: true,
    env: process.env,
    cwd: process.env.OPS_PWD,
    stdio: ["inherit", "inherit", "inherit"],
  });
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`command failed (${code}): ${cmd}`);
  }
}

/**
 * Determine the language kind from file extension
 * @param {string} filePath - Path to the file
 * @returns {string|null} - Language kind or null
 */
function getKindFromFile(filePath) {
  const ext = path.extname(filePath);
  const basename = path.basename(filePath);

  // Check by main file name
  if (basename === "__main__.py") return "python";
  if (basename === "index.js") return "nodejs";
  if (basename === "index.php") return "php";
  if (basename === "main.go") return "go";
  if (basename === "Main.java") return "java";

  // Check by extension
  if (ext === ".py") return "python";
  if (ext === ".js") return "nodejs";
  if (ext === ".php") return "php";
  if (ext === ".go") return "go";
  if (ext === ".java") return "java";
  if (ext === ".rb") return "ruby";
  if (ext === ".cs") return "dotnet";

  return null;
}

async function extractArgs(files) {
  const res = [];
  for (const file of files) {
    if (await fs.exists(file) && (await fs.stat(file)).isFile()) {
      const fileContent = await fs.readFile(file, "utf-8");
      const lines = fileContent.split("\n");
      for (const line of lines) {
        let argLine = null;

        // python style comment
        if (line.match(/^#[ ]?-{1,2}[^\s-].+/)) {
          argLine = line.trim().substring(1).trim();
        }
        // js style comment
        if (line.match(/^\/\/[ ]?-{1,2}[^\s-].+/)) {
          argLine = line.trim().substring(2).trim();
        }

        // Split the argument line into individual arguments
        if (argLine) {
          const parts = argLine.split(/\s+/);
          for (const part of parts) {
            if (part) res.push(part);
          }
        }
      }
    }
  }
  return res;
}

const packageDone = new Set();

export async function deployPackage(pkg) {
  const ppath = `packages/${pkg}.args`;
  const pargs = await extractArgs([ppath]);
  const args = pargs.join(" ");
  const cmd = `ops package update ${pkg} ${args}`;
  if (!packageDone.has(cmd)) {
    await exec(cmd);
    packageDone.add(cmd);
  }
}

export async function buildZip(pkg, action) {
  await exec(`ops ide util zip A=${pkg}/${action}`);
  return `packages/${pkg}/${action}.zip`;
}

export async function buildAction(pkg, action) {
  await exec(`ops ide util action A=${pkg}/${action}`);
  return `packages/${pkg}/${action}.zip`;
}

export async function deployAction(artifact) {
  let pkg = "",
    name = "",
    typ = "";

  if (activeDeployments.has(artifact)) {
    queue.push(artifact);
    return;
  }

  activeDeployments.set(artifact, true);
  const indexInQueue = queue.indexOf(artifact);
  if (indexInQueue > -1) {
    console.log(`⚙️ Deploying ${artifact} (from queue: ${indexInQueue})`);
  }

  try {
    const sp = artifact.split("/");
    const spData = sp[sp.length - 1].split(".");
    name = spData[0];
    typ = spData[1];
    pkg = sp[1];
  } catch(error) {

    console.log("❌ cannot deploy", artifact, "Error:", error.message);
    return;
  }

  await deployPackage(pkg);

  let toInspect;
  if (typ === "zip") {
    const base = artifact.slice(0, -4);
    toInspect = MAINS.map((m) => `${base}/${m}`);
  } else {
    toInspect = [artifact];
  }

  let args = await extractArgs(toInspect);
  let dockerFailed = false;

  // Check if there's a --docker <language>:extend:<auto|version> parameter and replace it
  const dockerArgIndex = args.findIndex(arg => arg === "--docker");
  if (dockerArgIndex !== -1 && dockerArgIndex + 1 < args.length) {
    const dockerValue = args[dockerArgIndex + 1];

    // Check if it matches the pattern <language>:extend:<auto|version>
    const extendMatch = dockerValue.match(/^(\w+):extend:([\w.]+)$/);
    if (extendMatch) {
      const kind = extendMatch[1]; // Extract the language kind (python, nodejs, etc.)
      const requestedVersion = extendMatch[2]; // "auto" or an explicit version

      try {
        console.log(`🔍 Detected --docker ${kind}:extend:${requestedVersion} annotation`);

        // Resolve and validate the version to extend
        const { version: resolvedVersion } = await getRuntimeImage(kind, requestedVersion);

        // Look for requirement file, so we can (re)build the image if the
        // requirement file hash changed since the last cached build
        const requirementFiles = {
          'python': 'requirements.txt',
          'nodejs': 'package.json',
          'php': 'composer.json',
          'java': 'pom.xml',
          'go': 'go.mod',
          'ruby': 'Gemfile',
          'dotnet': 'project.json'
        };

        let imageTag = null;
        const reqFile = requirementFiles[kind];
        if (reqFile) {
          // Check in packages directory first, then in current working directory
          const baseDir = process.env.OPS_PWD || process.cwd();
          const reqPath = path.join(baseDir, 'packages', reqFile);

          try {
            await fs.access(reqPath);
            // File exists: buildImage() compares the current hash against the
            // cached one and only triggers a real build when it changed
            const result = await buildImage(reqPath, resolvedVersion);
            if (result) {
              imageTag = await getBuiltImageTag(kind, resolvedVersion);
            }
          } catch (error) {
            console.log(`⚠️ No ${reqFile} found in packages directory, cannot build custom image`);
          }
        }

        // Fall back to a previously cached tag if the requirement file
        // couldn't be found/rebuilt but a cached image still exists
        if (!imageTag) {
          imageTag = await getBuiltImageTag(kind, resolvedVersion);
        }

        if (imageTag) {
          const registryHost = getRegistryHost();
          const fullImageTag = `${registryHost}/${imageTag}`;
          console.log(`🐳 Using custom built image: ${fullImageTag}`);
          // Replace <language>:extend:<auto|version> with the full image tag
          args[dockerArgIndex + 1] = fullImageTag;
        } else {
          console.log(`⚠️ Could not build custom image for ${kind}:${resolvedVersion}, using default runtime`);
          // Remove --docker <language>:extend:<auto|version> if no custom image is available
          args.splice(dockerArgIndex, 2);
        }
      } catch (error) {
        console.log("❌ cannot deploy", artifact, "Error:", error.message);
        dockerFailed = true;
      }
    }
  }

  const argsStr =args.join(" ");
  const actionName = `${pkg}/${name}`;

  if (!dockerFailed) {
    try {
      await exec(`ops action update ${actionName} ${artifact} ${argsStr}`);
      addActionToDeployInfo(pkg, name);
    } catch(error) {
      console.log("❌ cannot deploy", artifact, "Error:", error.message);
    }
  }

  activeDeployments.delete(artifact);

  if (queue.length > 0) {
    const nextArtifact = queue.shift();
    console.debug(`📦 deploying from queue artifact ${nextArtifact}`);
    await deploy(nextArtifact);
  }
}

/**
 * Deploy a `file`
 * @param file
 */
export async function deploy(file) {
  // Uncomment the lines below to test specific files
  // const file = "packages/deploy/hello.py";
  // const file = "packages/deploy/multi.zip";
  // const file = "packages/deploy/multi/__main__.py";
  // const file = "packages/deploy/multi/requirements.txt";

  const stat = await fs.stat(file);

  if (stat.isDirectory()) {
    for (const start of MAINS) {
      const sub = `${file}/${start}`;
      if (await fs.exists(sub)) {
        file = sub;
        break;
      }
    }
  }

  const sp = file.split("/");
  if (sp.length > 3) {
    await buildZip(sp[1], sp[2]);
    file = await buildAction(sp[1], sp[2]);
  }
  console.log(`Deploying ${file}`);
  await deployAction(file);
}

/**
 * Deploy a `manifest.yaml` file using `ops -wsk project`
 * @param artifact
 */
export async function deployProject(artifact) {
  if (await fs.exists(artifact)) {
    const manifestContent = await Bun.file(artifact).text();
    if (manifestContent.indexOf("packages:") !== -1) {
      await exec(`ops -wsk project deploy --manifest ${artifact}`);
    } else {
      console.log(
        `⚠️ Warning: it seems that the ${artifact} file is not a valid manifest file. Skipping`
      );
    }
  }
}
