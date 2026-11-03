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
import crypto from "crypto";
import { expandEnv } from "./env_utils";
const { parse } = await import("shell-quote");

// Polling configuration for build status checks
const BUILD_POLL_INTERVAL_MS = 3000;
const BUILD_TIMEOUT_MS = parseInt(process.env.OPS_BUILD_TIMEOUT_MS, 10) || 10 * 60 * 1000;

// Map of requirement files to their corresponding language kinds
const REQUIREMENT_MAPPING = {
  "requirements.txt": "python",
  "package.json": "nodejs",
  "composer.json": "php",
  "pom.xml": "java",
  "go.mod": "go",
  "Gemfile": "ruby",
  "project.json": "dotnet",
};

/**
 * Get the language kind for a given requirement file
 * @param {string} filename - The requirement file name
 * @returns {string|null} - The language kind or null if not found
 */
function getKindFromRequirement(filename) {
  return REQUIREMENT_MAPPING[filename] || null;
}

/**
 * Compute MD5 hash of a file
 * @param {string} filePath - Path to the file
 * @returns {Promise<string>} - MD5 hash in hex format
 */
async function computeFileHash(filePath) {
  const content = await fs.readFile(filePath);
  return crypto.createHash("md5").update(content).digest("hex");
}

/**
 * Get auth token from ops command
 * @returns {Promise<string>} - Auth token
 */
async function getAuthToken() {
  const cmd = "ops -wsk property get --auth";
  const cmdArgs = parse(expandEnv(cmd)).filter((arg) => typeof arg === "string");

  const proc = Bun.spawn(cmdArgs, {
    shell: true,
    env: process.env,
    stdout: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  // Parse output like "whisk auth		d97403a8-c1aa-49b3-ad5a-50b380ec3ab1:8YpXsnlSBrqWydMRQd4AuOMQ57obmczwi0fAWQlewbGjKhqMxeSRJ24RdsKGefrl"
  const match = output.match(/whisk auth\s+(.+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  throw new Error("Failed to get auth token from ops command");
}

/**
 * Get API host from ops config
 * @returns {Promise<string>} - API host URL
 */
async function getApiHost() {
  const cmd = "ops -wsk property get --apihost";
  const cmdArgs = parse(expandEnv(cmd)).filter((arg) => typeof arg === "string");

  const proc = Bun.spawn(cmdArgs, {
    shell: true,
    env: process.env,
    stdout: "pipe",
  });

  const output = await new Response(proc.stdout).text();
  await proc.exited;

  // Parse output like "whisk API host		https://api.example.com"
  const match = output.match(/whisk API host\s+(.+)/);
  if (match && match[1]) {
    return match[1].trim();
  }
  throw new Error("Failed to get API host from ops command");
}

/**
 * Poll the admin API for a build job's status until it succeeds or fails
 * @param {string} apiHost - API host URL
 * @param {string} authToken - Auth token
 * @param {string} buildId - Build id returned by /build/start
 * @returns {Promise<void>} - Resolves when the build succeeds
 * @throws {Error} - If the build fails, the status check errors, or it times out
 */
async function pollBuildStatus(apiHost, authToken, buildId) {
  const statusUrl = `${apiHost}/system/api/v1/build/status?id=${buildId}`;
  const headers = {
    "Authorization": `Basic ${Buffer.from(authToken).toString("base64")}`,
  };
  const deadline = Date.now() + BUILD_TIMEOUT_MS;

  while (true) {
    const response = await fetch(statusUrl, { headers });

    if (response.status !== 200) {
      const errorText = await response.text();
      throw new Error(`Build status check failed with status ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    const phase = result?.data?.phase ?? result?.phase;

    if (phase === "Succeeded") {
      return;
    }
    if (phase === "Failed") {
      throw new Error(`Build ${buildId} failed`);
    }

    if (Date.now() >= deadline) {
      throw new Error(`Timed out waiting for build ${buildId} to complete (phase: ${phase})`);
    }

    console.log(`⏳ Build ${buildId} status: ${phase}, waiting...`);
    await Bun.sleep(BUILD_POLL_INTERVAL_MS);
  }
}

/**
 * Load and parse runtimes.json
 * @returns {Promise<Object>} - Runtimes configuration
 */
async function loadRuntimes() {
  const opsRoot = process.env.OPS_ROOT;
  const runtimesPath = path.join(opsRoot, "runtimes.json");
  const content = await fs.readFile(runtimesPath, "utf-8");
  return JSON.parse(content);
}

/**
 * Resolve the runtime image to extend for a given kind and version.
 * Extendibility and release metadata now live under the "openserverless" key
 * of each runtime entry in runtimes.json (formerly kept in ops-runtimes.json).
 * @param {string} kind - Language kind (python, nodejs, go, java, php, ...)
 * @param {string} version - "auto" for the most recently released extendible
 *   version, or an explicit version (e.g. "3.13", with or without a leading "v")
 * @returns {Promise<{image: string, version: string}>} - Source image and the resolved plain version
 */
export async function getRuntimeImage(kind, version) {
  const runtimes = await loadRuntimes();
  const languageRuntimes = runtimes.runtimes[kind];
  if (!languageRuntimes || languageRuntimes.length === 0) {
    throw new Error(`No runtime found for kind: ${kind}`);
  }

  const extendibleEntries = languageRuntimes
    .filter((r) => r.openserverless?.extendible === true)
    .map((r) => ({ version: r.kind.slice(kind.length + 1), ...r.openserverless }));

  if (extendibleEntries.length === 0) {
    throw new Error(`No extendible versions available for kind: ${kind}`);
  }

  let resolvedVersion;
  if (version === "auto") {
    const sorted = [...extendibleEntries].sort(
      (a, b) => new Date(b.releaseDate) - new Date(a.releaseDate)
    );
    resolvedVersion = sorted[0].version;
  } else {
    const normalized = version.replace(/^v/, "");
    const match = extendibleEntries.find((e) => e.version === normalized);
    if (!match) {
      const available = extendibleEntries.map((e) => e.version).join(", ");
      throw new Error(
        `Version ${version} is not extendible for kind ${kind}. Extendible versions: ${available}`
      );
    }
    resolvedVersion = match.version;
  }

  const runtimeEntry = languageRuntimes.find((r) => r.kind === `${kind}:${resolvedVersion}`);
  if (!runtimeEntry) {
    throw new Error(
      `Version ${resolvedVersion} is extendible for kind ${kind} but no matching runtime image was found in runtimes.json (expected kind "${kind}:${resolvedVersion}")`
    );
  }

  const { prefix, name, tag } = runtimeEntry.image;
  return { image: `${prefix}/${name}:${tag}`, version: resolvedVersion };
}

/**
 * Get username from environment variable
 * @returns {string} - Username from OPSDEV_USERNAME
 * @throws {Error} - If OPSDEV_USERNAME is not set
 */
function getUsername() {
  const username = process.env.OPSDEV_USERNAME;
  if (!username) {
    throw new Error("OPSDEV_USERNAME environment variable is not set. Cannot build custom images.");
  }
  return username;
}

/**
 * Load cached image hash for a language kind + version
 * @param {string} kind - Language kind
 * @param {string} version - Resolved runtime version
 * @returns {Promise<string|null>} - Cached hash or null if not found
 */
async function loadCachedImageHash(kind, version) {
  const cachePath = path.join(process.env.OPS_PWD || process.cwd(), ".ops", `image.${kind}-${version}`);
  try {
    const hash = await fs.readFile(cachePath, "utf-8");
    return hash.trim();
  } catch (error) {
    return null;
  }
}

/**
 * Save image hash to cache
 * @param {string} kind - Language kind
 * @param {string} version - Resolved runtime version
 * @param {string} hash - Image hash
 */
async function saveCachedImageHash(kind, version, hash) {
  const opsDir = path.join(process.env.OPS_PWD || process.cwd(), ".ops");

  // Create .ops directory if it doesn't exist
  try {
    await fs.mkdir(opsDir, { recursive: true });
  } catch (error) {
    // Directory might already exist
  }

  const cachePath = path.join(opsDir, `image.${kind}-${version}`);
  await fs.writeFile(cachePath, hash);
}

/**
 * Build a custom runtime image via admin API
 * @param {string} requirementFile - Path to requirement file
 * @param {string} [version="auto"] - Runtime version to extend ("auto" or an explicit extendible version)
 * @returns {Promise<{hash: string, version: string}|null>} - Image hash and resolved version
 */
export async function buildImage(requirementFile, version = "auto") {
  const filename = path.basename(requirementFile);
  const kind = getKindFromRequirement(filename);

  if (!kind) {
    console.log(`⚠️ Unknown requirement file type: ${filename}`);
    return null;
  }

  console.log(`🔨 Building image for ${kind} from ${requirementFile}`);

  // Resolve the runtime image and concrete version to extend
  const { image: sourceImage, version: resolvedVersion } = await getRuntimeImage(kind, version);

  // Compute hash of requirement file
  const hash = await computeFileHash(requirementFile);
  console.log(`📊 Computed hash: ${hash}`);

  // Check if we already built this image
  const cachedHash = await loadCachedImageHash(kind, resolvedVersion);
  console.log(`📊 Cached hash: ${cachedHash || 'none'}`);

  if (cachedHash === hash) {
    console.log(`✅ Image already built for ${kind}:${resolvedVersion} (hash: ${hash})`);
    return { hash, version: resolvedVersion };
  }

  console.log(`🔄 Hash mismatch, building new image...`);

  // Get username, auth token and API host
  const username = getUsername();
  const authToken = await getAuthToken();
  const apiHost = await getApiHost();

  // Build target image tag
  const targetImage = `${username}:${kind}-${resolvedVersion}-${hash}`;

  // Read and base64 encode the requirement file
  const fileContent = await fs.readFile(requirementFile, "utf-8");
  const base64File = Buffer.from(fileContent).toString("base64");

  // Prepare build request
  const buildRequest = {
    source: sourceImage,
    target: targetImage,
    kind: kind,
    file: base64File,
  };

  // Send build request to admin API
  const buildUrl = `${apiHost}/system/api/v1/build/start`;
  console.log(`📡 Sending build request to ${buildUrl}`);

  try {
    const response = await fetch(buildUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(authToken).toString("base64")}`,
      },
      body: JSON.stringify(buildRequest),
    });

    if (response.status === 200) {
      const result = await response.json();
      
      const jobName = result?.job_name || 'unknown';
      const jobId = result?.id || 'unknown';

      console.log(`🚀 Build started for ${kind}:${resolvedVersion}`);
      console.log(`🏗️ Kubernetes job: ${jobName} (ID: ${jobId})`);

      // Wait for the Kubernetes job to complete
      await pollBuildStatus(apiHost, authToken, jobId);
      console.log(`✅ Build completed successfully for ${kind}:${resolvedVersion}`);

      // Save the hash to cache
      await saveCachedImageHash(kind, resolvedVersion, hash);

      return { hash, version: resolvedVersion };
    } else {
      const errorText = await response.text();
      console.error(`❌ Build failed with status ${response.status}: ${errorText}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Build failed for ${kind}:${resolvedVersion}: ${error.message}`);
    return null;
  }
}

/**
 * Get the built image tag for a language kind + version
 * @param {string} kind - Language kind
 * @param {string} version - Resolved runtime version
 * @returns {Promise<string|null>} - Image tag in format "user:kind-version-hash" or null
 */
export async function getBuiltImageTag(kind, version) {
  const hash = await loadCachedImageHash(kind, version);
  if (hash) {
    const username = getUsername();
    return `${username}:${kind}-${version}-${hash}`;
  }
  return null;
}

/**
 * Scan for requirement files in the packages directory and build images
 * @returns {Promise<void>}
 */
export async function scanAndBuildImages() {
  const topLevelFiles = [
    "requirements.txt",
    "package.json",
    "composer.json",
    "pom.xml",
    "go.mod",
    "Gemfile",
    "project.json",
  ];

  const buildPromises = [];
  const baseDir = process.env.OPS_PWD || process.cwd();
  const packagesDir = path.join(baseDir, 'packages');

  for (const file of topLevelFiles) {
    const filePath = path.join(packagesDir, file);
    try {
      await fs.access(filePath);
      console.log(`📦 Found requirement file: packages/${file}`);
      buildPromises.push(buildImage(filePath));
    } catch (error) {
      // File doesn't exist, skip
    }
  }

  if (buildPromises.length > 0) {
    await Promise.all(buildPromises);
  } else {
    console.log("ℹ️ No requirement files found in packages directory");
  }
}

/**
 * Extract docker annotation from action files
 * @param {string[]} files - Array of file paths to check
 * @returns {Promise<{kind: string, version: string}|null>} - Language kind + requested version, or null
 */
async function extractDockerAnnotation(files) {
  for (const file of files) {
    try {
      const fileContent = await fs.readFile(file, "utf-8");
      const lines = fileContent.split("\n");

      for (const line of lines) {
        // Match Python-style comments: # --docker <language>:extend:<auto|version>
        const pythonMatch = line.match(/^#\s*--docker\s+(\w+):extend:([\w.]+)/);
        if (pythonMatch) {
          return { kind: pythonMatch[1], version: pythonMatch[2] };
        }

        // Match JS-style comments: // --docker <language>:extend:<auto|version>
        const jsMatch = line.match(/^\/\/\s*--docker\s+(\w+):extend:([\w.]+)/);
        if (jsMatch) {
          return { kind: jsMatch[1], version: jsMatch[2] };
        }
      }
    } catch (error) {
      // File doesn't exist or can't be read, skip
    }
  }

  return null;
}

/**
 * Build image for a specific action if it has docker annotation
 * @param {string} actionPath - Path to action file or directory
 * @returns {Promise<void>}
 */
export async function buildImageForAction(actionPath) {
  const MAINS = ["__main__.py", "index.js", "index.php", "main.go", "Main.java"];
  const stat = await fs.stat(actionPath);

  let filesToCheck = [];

  if (stat.isDirectory()) {
    // Check main files in directory
    for (const main of MAINS) {
      const mainPath = path.join(actionPath, main);
      try {
        await fs.access(mainPath);
        filesToCheck.push(mainPath);
      } catch (error) {
        // File doesn't exist, skip
      }
    }
  } else {
    // Single file
    filesToCheck.push(actionPath);
  }

  // Extract docker annotation
  const annotation = await extractDockerAnnotation(filesToCheck);

  if (!annotation) {
    console.log(`ℹ️ No --docker <language>:extend:<auto|version> annotation found in ${actionPath}`);
    return;
  }

  const { kind, version } = annotation;
  console.log(`🔍 Found --docker ${kind}:extend:${version} annotation`);

  // Map kind to requirement file
  const requirementFiles = {
    'python': 'requirements.txt',
    'nodejs': 'package.json',
    'php': 'composer.json',
    'java': 'pom.xml',
    'go': 'go.mod',
    'ruby': 'Gemfile',
    'dotnet': 'project.json'
  };

  const reqFile = requirementFiles[kind];
  if (!reqFile) {
    console.log(`⚠️ Unknown language kind: ${kind}`);
    return;
  }

  // Build path to requirement file
  const baseDir = process.env.OPS_PWD || process.cwd();
  const reqPath = path.join(baseDir, 'packages', reqFile);

  try {
    await fs.access(reqPath);
  } catch (error) {
    console.log(`⚠️ No ${reqFile} found in packages directory`);
    return;
  }

  try {
    console.log(`📦 Building image for ${kind}:${version} using packages/${reqFile}`);
    await buildImage(reqPath, version);
  } catch (error) {
    console.log(`❌ Cannot build image for ${kind}:extend:${version}. Error: ${error.message}`);
  }
}
