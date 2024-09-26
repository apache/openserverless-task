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

import { readFileSync } from 'fs';
import { spawn } from 'child_process';
import { resolve } from 'path';
import process from 'process';
import { createInterface } from 'readline';

export function getOpenServerlessConfig(key, defaultValue) {
  try {
    const dir = process.env.OPS_PWD || '/do_not_exists';
    const file = resolve(dir, 'package.json');
    const info = JSON.parse(readFileSync(file, 'utf8'));
    return info.openserverless?.[key] || defaultValue;
  } catch {
    return defaultValue;
  }
}

function readlines(inp) {
  const rl = createInterface({ input: inp, terminal: false });
  rl.on('line', (line) => {
    console.log(line);
  });
}

export function launch(key, defaultValue) {
  const cmd = getOpenServerlessConfig(key, defaultValue);
  const proc = spawn(cmd, {
    shell: true,
    cwd: process.env.OPS_PWD,
    env: process.env,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  readlines(proc.stdout);
  readlines(proc.stderr);
}

export function serve() {
  launch('devel', 'ops ide serve');
}

export function logs() {
  launch('logs', 'ops activation poll');
}

export function build() {
  const deploy = getOpenServerlessConfig('deploy', 'true');
  const proc = spawn(deploy, {
    shell: true,
    env: process.env,
    cwd: process.env.OPS_PWD,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  proc.stdout.on('data', (data) => {
    console.log(data.toString());
  });

  proc.stderr.on('data', (data) => {
    console.error(data.toString());
  });

  proc.on('close', (code) => {
    console.log(`build process exited with code ${code}`);
  });
}
