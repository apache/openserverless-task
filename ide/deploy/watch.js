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

const SKIPDIR = ["virtualenv", "node_modules", "__pycache__"];

import {watch} from 'chokidar';
import {resolve} from 'path';
import {deploy} from './deploy.js';
import {logs, serve} from './client.js';
import {buildImage} from './builder.js';

import process from 'process';

export let globalWatcher;
export let requirementsWatcher;

// Requirement files to watch in packages directory
const REQUIREMENT_FILES = [
  "packages/requirements.txt",
  "packages/package.json",
  "packages/composer.json",
  "packages/pom.xml",
  "packages/go.mod",
  "packages/Gemfile",
  "packages/project.json",
];

export const watcherOptions = {
  persistent: true,
  ignoreInitial: true,
  recursive: true,
  // WHY: MCP scaffold/service tools rewrite generated wrappers in multiple
  // writes. Deploying the first partial write can miss #--kind and produce an
  // invalid ZIP update, so wait for the file to remain stable before reading it.
  awaitWriteFinish: {
    stabilityThreshold: 500,
    pollInterval: 100,
  },
  atomic: 250,
  ignored: (file) => shouldIgnoreFile(file),
};


/**
 * This function will return true when the file should
 * be ignored by fs watcher or the deployer
 * @param path
 * @returns {*|boolean}
 */
export function shouldIgnoreFile(path) {
  return path.endsWith('.zip') || /\.tmp\d*$/.test(path);
}

/**
 * This function will receive fs watcher events and
 * decide if the file should be deployed
 *
 * @param changeType
 * @param path
 */
export async function checkAndDeploy(changeType, path) {
  console.log(`(checkAndDeploy) > ${changeType} ${path}`);
  path = resolve(path);
  if (shouldIgnoreFile(path)) return;
  const curDirLen = process.cwd().length + 1;
  const src = path.slice(curDirLen);

  if (changeType !== 'change') return;
  if (src.endsWith('/')) return;
  if (!src) return;
  for (const dir of src.split('/').slice(0, -1)) {
    if (SKIPDIR.includes(dir)) return;
  }
  // this should not even happen
  if (shouldIgnoreFile(src)) return;

  console.log(`(checkAndDeploy -> deploy) > ${changeType} ${path}`);
  await deploy(src);
}

/**
 * Watch for changes in top-level requirement files and rebuild images
 */
async function watchRequirementFiles() {
  console.log("> Watching requirement files for image builds:");

  requirementsWatcher = watch(REQUIREMENT_FILES, {
    persistent: true,
    ignoreInitial: true,
    atomic: 250,
  });

  requirementsWatcher.on('change', async (path) => {
    console.log(`📦 Requirement file changed: ${path}`);
    try {
      await buildImage(path);
    } catch (error) {
      console.error(`❌ Error building image for ${path}:`, error);
    }
  });

  return new Promise((resolve, reject) => {
    requirementsWatcher.on('error', reject);
  });
}

/**
 * Called by `watchAndDeploy`, this function will install
 * a filesystem watcher on packages dir and catch every
 * event and send them to `checkAndDeploy`
 * @returns {Promise<unknown>}
 */
async function redeploy() {
  console.log("> Watching:");
  globalWatcher = watch('packages', watcherOptions);


  globalWatcher.on('all', async (event, path) => {
    try {
      await checkAndDeploy(event, path);
    } catch (error) {
      console.error(error);
    }
  });

  return new Promise((resolve, reject) => {
    globalWatcher.on('error', reject);
  });
}

/**
 * This function is the entry point and is called when
 * the program is started with the watch flag on
 */
export async function watchAndDeploy() {
  await serve();
  await logs();

  try {
    // Start watching requirement files for image builds
    watchRequirementFiles().catch(error => {
      console.error("Requirements watcher failed:", error);
    });

    // Start watching packages for deployments
    await redeploy();
  }
  catch(error) {
    console.error("Watcher failed:", error);
  };
}
