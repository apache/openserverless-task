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
import process from 'process';

export function checkAndDeploy(changeType, path) {
  path = resolve(path);
  if (path.endsWith('.zip') || path.endsWith('.tmp')) return;
  const curDirLen = process.cwd().length + 1;
  const src = path.slice(curDirLen);

  if (changeType !== 'change') return;
  if (src.endsWith('/')) return;
  if (!src) return;
  for (const dir of src.split('/').slice(0, -1)) {
    if (SKIPDIR.includes(dir)) return;
  }
  if (src.endsWith('.zip')) return;

  deploy(src);
}

async function redeploy() {
  console.log("> Watching:");
  const watcher = watch('packages', {
    persistent: true,
    ignoreInitial: true,
    recursive: true,
    //awaitWriteFinish: true,
    atomic: 250,
    ignored: (file) => file.endsWith('.zip') || file.endsWith('.tmp'),
  });

  watcher.on('all', (event, path) => {
    try {
      checkAndDeploy(event, path);
    } catch (error) {
      console.error(error);
    }
  });

  return new Promise((resolve, reject) => {
    watcher.on('error', reject);
    process.on('SIGTERM', () => {
      console.log("Ending task.");
      watcher.close();
      resolve();
    });
  });
}

export function watchAndDeploy() {
  serve();
  logs();

  redeploy().catch((error) => {
    console.error("Watcher failed:", error);
  });
}
