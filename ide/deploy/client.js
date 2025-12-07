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

import {readFile} from 'fs/promises';
import {resolve} from 'path';
import process from 'process';
import {globalWatcher} from './watch.js';
import {expandEnv} from './env_utils.js';
const { parse } = await import('shell-quote');
export let globalProc = undefined;

async function signalHandler() {
    if (globalProc) {
        console.log(`🔥Killing process pid ${globalProc.pid}`);
        globalProc.kill();
    }
    if (globalWatcher) {
        console.log("☠️ Stopping watcher");
        await globalWatcher.close();
    }
    process.exit(0);
}

// Register signal handlers once at module level
process.on('SIGINT', signalHandler);
process.on('SIGTERM', signalHandler);

/**
 * Read a key from OpenServerless configuration added to a `package.json` file in the
 * root of the project
 * @param key the key to read
 * @param defaultValue a default value to be returned when the key is not found
 * @returns {*}
 */
export async function getOpenServerlessConfig(key, defaultValue) {
    try {
        const dir = process.env.OPS_PWD || '/do_not_exists';
        const file = resolve(dir, 'package.json');
        const json = await readFile(file, 'utf8');
        const info = JSON.parse(json);
        return info.openserverless?.[key] || defaultValue;
    } catch {
        return defaultValue;
    }
}

/**
 * launch a process with the command taken from OpenServerless Config
 * (see `getOpenServerlessConfig`)
 * @param key
 * @param defaultValue
 */
export async function launch(key, defaultValue) {
    const cmd = await getOpenServerlessConfig(key, defaultValue);
    const cmdArgs = parse(cmd).filter(arg => typeof arg === "string");
    Bun.spawn(cmdArgs, {
        shell: true,
        env: process.env,
        cwd: process.env.OPS_PWD,
        stdio: ['inherit', 'inherit', 'inherit']
    });
}

/**
 * start `ops ide serve` or a custom devel function specified
 * through `getOpenServerlessConfig` mechanism
 */
export async function serve() {
    launch('devel', 'ops ide serve');    
}

/**
 * start `ops activation poll` or a custom logs function
 * through `getOpenServerlessConfig` mechanism
 */
export async function logs() {
    launch('logs', 'ops activation poll');
}

/**
 * start a custom deploy function if required from the user
 * through `getOpenServerlessConfig` mechanism
 */
export async function build() {
    let deploy = await getOpenServerlessConfig('deploy', 'true');
    deploy = expandEnv(deploy);

    const deployArgs = parse(deploy).filter(arg => typeof arg === "string");

    if (globalProc !== undefined) {
        globalProc.kill();
    }

    globalProc = Bun.spawn(deployArgs, {
        shell: true,
        env: process.env,
        cwd: process.env.OPS_PWD,
        stdio: ['inherit', 'inherit', 'inherit']
    });

    console.log(`✈️ Deploy Child process: ${deploy} has PID: ${globalProc.pid}`);

    // Await its completion
    try {
        const code = await globalProc.exited;
        console.log(`build process exited with code ${code}`);
    } catch (err) {
        console.error("Error awaiting process exit:", err);
    }

}
