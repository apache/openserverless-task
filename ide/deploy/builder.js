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

const PROFILE_NAME = /^[a-z0-9][a-z0-9._-]{0,62}$/;
const BUILDER_ID = /^[a-z0-9][a-z0-9._:-]{0,62}$/;
const ACTION_NAME = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const IMAGE_REFERENCE = /^[A-Za-z0-9][A-Za-z0-9._:/@-]{0,511}$/;

function projectDirectory(options = {}) {
  return options.projectDir || process.env.OPS_PWD || process.cwd();
}

export async function loadRuntimeProfiles(options = {}) {
  const packagePath = path.join(projectDirectory(options), "package.json");
  let document;
  try {
    document = JSON.parse(await fs.readFile(packagePath, "utf8"));
  } catch (error) {
    if (error.code === "ENOENT") return {};
    throw new Error(`cannot read ${packagePath}: ${error.message}`);
  }

  const profiles = document.openserverless?.runtimeProfiles || {};
  if (typeof profiles !== "object" || Array.isArray(profiles)) {
    throw new Error("openserverless.runtimeProfiles must be an object");
  }

  const result = {};
  const assignedActions = new Set();
  for (const [name, profile] of Object.entries(profiles)) {
    if (!PROFILE_NAME.test(name)) throw new Error(`invalid runtime profile name: ${name}`);
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
      throw new Error(`runtime profile ${name} must be an object`);
    }
    if (!BUILDER_ID.test(profile.builder || "")) {
      throw new Error(`runtime profile ${name} has an invalid builder`);
    }
    if (typeof profile.requirements !== "string" || !profile.requirements.trim()) {
      throw new Error(`runtime profile ${name} requires a requirements file`);
    }
    if (!Array.isArray(profile.actions) || profile.actions.length === 0) {
      throw new Error(`runtime profile ${name} requires at least one action`);
    }
    for (const action of profile.actions) {
      if (typeof action !== "string" || !ACTION_NAME.test(action)) {
        throw new Error(`runtime profile ${name} has invalid action ${action}`);
      }
      if (assignedActions.has(action)) {
        throw new Error(`action ${action} is assigned to more than one runtime profile`);
      }
      assignedActions.add(action);
    }
    result[name] = {
      builder: profile.builder,
      requirements: profile.requirements,
      actions: [...new Set(profile.actions)],
    };
  }
  return result;
}

export async function runtimeProfileWatchEntries(options = {}) {
  const profiles = await loadRuntimeProfiles(options);
  return Object.entries(profiles).map(([name, profile]) => ({
    name,
    path: path.resolve(projectDirectory(options), profile.requirements),
    actions: profile.actions,
  }));
}

async function runOpsProperty(property) {
  const ops = process.env.OPS || "ops";
  const proc = Bun.spawn([ops, "-wsk", "property", "get", property], {
    env: process.env,
    stdout: "pipe",
    stderr: "pipe",
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) throw new Error(stderr.trim() || `cannot read ${property}`);
  const line = stdout.split("\n").find((item) => item.trim()) || "";
  const value = line.replace(/^whisk\s+(?:API host|auth)\s+/i, "").trim();
  if (!value) throw new Error(`empty ${property} returned by ops`);
  return value;
}

async function defaultCredentials() {
  return {
    apiHost: (await runOpsProperty("--apihost")).replace(/\/$/, ""),
    auth: await runOpsProperty("--auth"),
  };
}

async function responsePayload(response) {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`builder returned HTTP ${response.status}: ${text}`);
  }
}

function validateImage(image) {
  if (typeof image !== "string" || !IMAGE_REFERENCE.test(image)) {
    throw new Error("builder returned an invalid action image reference");
  }
  return image;
}

export async function ensureRuntimeProfiles(actionFilter = null, options = {}) {
  const profiles = await loadRuntimeProfiles(options);
  const selectedActions = actionFilter ? new Set(actionFilter) : null;
  const selectedProfiles = Object.entries(profiles).filter(([, profile]) =>
    !selectedActions || profile.actions.some((action) => selectedActions.has(action))
  );
  const runtimeImages = new Map();
  if (selectedProfiles.length === 0) return runtimeImages;

  if (options.dryRun) {
    for (const [name, profile] of selectedProfiles) {
      console.log(`[dry-run] ensure runtime profile ${name} with ${profile.builder}`);
    }
    return runtimeImages;
  }

  const fetchImpl = options.fetchImpl || fetch;
  const sleep = options.sleep || ((milliseconds) => Bun.sleep(milliseconds));
  const credentials = options.credentials || await defaultCredentials();
  const pollInterval = options.pollInterval ?? 2000;
  const timeout = options.timeout ?? 15 * 60 * 1000;

  for (const [name, profile] of selectedProfiles) {
    const requirementsPath = path.resolve(projectDirectory(options), profile.requirements);
    const projectRoot = path.resolve(projectDirectory(options));
    if (requirementsPath !== projectRoot && !requirementsPath.startsWith(`${projectRoot}${path.sep}`)) {
      throw new Error(`runtime profile ${name} requirements must stay inside the project`);
    }
    let requirements;
    try {
      requirements = await fs.readFile(requirementsPath);
    } catch (error) {
      throw new Error(`cannot read runtime profile ${name} requirements: ${error.message}`);
    }

    const ensureResponse = await fetchImpl(`${credentials.apiHost}/system/api/v1/build/ensure`, {
      method: "POST",
      headers: {
        "authorization": credentials.auth,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        builder: profile.builder,
        file: requirements.toString("base64"),
      }),
    });
    const initial = await responsePayload(ensureResponse);
    if (!ensureResponse.ok && ensureResponse.status !== 202) {
      throw new Error(initial.message || `runtime profile ${name} build failed`);
    }

    let state = initial;
    const startedAt = Date.now();
    while (state.state === "queued" || state.state === "running") {
      if (!state.id) throw new Error(`runtime profile ${name} response has no build id`);
      if (Date.now() - startedAt >= timeout) {
        throw new Error(`runtime profile ${name} build timed out`);
      }
      await sleep(pollInterval);
      const statusResponse = await fetchImpl(
        `${credentials.apiHost}/system/api/v1/build/${state.id}`,
        {headers: {"authorization": credentials.auth}},
      );
      state = await responsePayload(statusResponse);
      if (!statusResponse.ok && statusResponse.status !== 202 && state.state !== "failed") {
        throw new Error(state.message || `cannot query runtime profile ${name}`);
      }
    }

    if (state.state !== "succeeded") {
      throw new Error(state.message || `runtime profile ${name} build failed`);
    }
    const image = validateImage(state.image);
    console.log(`Runtime profile ${name}: ${image}`);
    for (const action of profile.actions) {
      if (!selectedActions || selectedActions.has(action)) runtimeImages.set(action, image);
    }
  }
  return runtimeImages;
}
