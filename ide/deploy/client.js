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

import {readFileSync} from 'fs';
import {spawn} from 'child_process';
import {resolve} from 'path';
import process from 'process';
import {createInterface} from 'readline';
import {globalWatcher} from "./watch";

export let globalProc = undefined;

/**
 * Read a key from OpenServerless configuration added to a `package.json` file in the
 * root of the project
 * @param key the key to read
 * @param defaultValue a default value to be returned when the key is not found
 * @returns {*}
 */
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

/**
 * This function creates a line-by-line interface over the provided input stream
 * and logs each line to the console as it is received.
 * @param {ReadableStream} inp - The input stream to read lines from.
 * @returns {void}
 */
function readlines(inp) {
    const rl = createInterface({input: inp, terminal: false});
    rl.on('line', (line) => {
        console.log(line);
    });
}

/**
 * laungh a process with the command taken from OpenServerless Config
 * (see `getOpenServerlessConfig`)
 * @param key
 * @param defaultValue
 */
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

/**
 * start `ops ide serve` or a custom devel function specified
 * through `getOpenServerlessConfig` mechanism
 */
export function serve() {
    launch('devel', 'ops ide serve');
}

/**
 * start `ops activation poll` or a custom logs function
 * through `getOpenServerlessConfig` mechanism
 */
export function logs() {
    launch('logs', 'ops activation poll');
}

async function signalHandler() {
    console.log(`🔥Killing process pid ${globalProc.pid}`);
    if (globalWatcher) {
        console.log("☠️ Stopping watcher");
        await globalWatcher.close();
    }
    globalProc.kill();
    process.exit(0);
}

/**
 * start a custom deploy function if required from the user
 * through `getOpenServerlessConfig` mechanism
 */
export async function build() {
    const deploy = getOpenServerlessConfig('deploy', 'true');

    if (globalProc !== undefined) {
        globalProc.kill();
    }

    globalProc = spawn(deploy, {
        shell: true,
        env: process.env,
        cwd: process.env.OPS_PWD,
        stdio: ['pipe', 'pipe', 'pipe']
    });

    console.log(`✈️ Deploy Child process: ${deploy} has PID: ${globalProc.pid}`);

    globalProc.stdout.on('data', (data) => {
        console.log(data.toString());
    });

    globalProc.stderr.on('data', (data) => {
        console.error(data.toString());
    });

    globalProc.on('close', (code) => {
        console.log(`build process exited with code ${code}`);
    });

    process.on('SIGINT', signalHandler);
    process.on('SIGTERM', signalHandler);

    await globalProc.exited;


}
