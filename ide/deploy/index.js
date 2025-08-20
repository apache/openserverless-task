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

import {existsSync, writeFileSync, mkdirSync, unlinkSync} from 'fs';
import {createServer} from 'net';
import process from 'process';
import {program} from 'commander';
import {scan} from './scan.js';
import {watchAndDeploy, globalWatcher} from './watch.js';
import {setDryRun, deploy} from './deploy.js';
import {build} from './client.js';



async function signalHandler() {
    console.log('Termination requested.');

    if (globalWatcher) {
        console.log("☠️ SIGKILL - Stopping watcher");
        await globalWatcher.close();
    }

    unlinkSync(expanduser('~/.ops/tmp/deploy.pid'));
    process.kill(process.getpgrp(), 'SIGKILL');
    process.exit(0); // should not be reached but just in case...
}

function checkPort() {
    const server = createServer();
    server.listen(8080, '127.0.0.1');
    server.on('error', () => {
        console.log('deployment mode already active (or something listening in 127.0.0.1:8080)');
        server.close();
    });
    server.on('listening', () => server.close());
}

function expanduser(path) {
    return path.replace(/^~(?=$|\/|\\)/, process.env.HOME || process.env.USERPROFILE);
}

async function main() {

    const pid = process.pid;


    process.on('SIGTERM', signalHandler);
    process.on('SIGKILL', signalHandler);
    const pidfile = expanduser('~/.ops/tmp/deploy.pid');
    console.log('PID', pid);

    mkdirSync(expanduser('~/.ops/tmp'), {recursive: true});
    writeFileSync(pidfile, pid.toString());

    program
        .description('Deployer')
        .argument('<directory>', 'The mandatory first argument')
        .option('-n, --dry-run', 'Dry Run')
        .option('-f, --fast', 'Fast deploy mode')
        .option('-d, --deploy', 'Deploy')
        .option('-w, --watch', 'Watch for changes')
        .option('-s, --single <string>', 'Deploy a single action, either a single file or a directory.', '')
        .parse(process.argv);

    const options = program.opts();
    const directory = program.args[0];

    setDryRun(options.dryRun);
    process.chdir(directory);

    if (options.watch) {
        checkPort();
        if (!options.fast) {
            await scan();
            await build();
        }
        await watchAndDeploy();

    } else if (options.deploy) {
        await scan();
        await build()
        process.exit(0);
    } else if (options.single !== '') {
        let action = options.single;
        if (!action.startsWith('packages/')) {
            action = `packages/${action}`;
        }
        if (!existsSync(action)) {
            console.log(`❌ action ${action} not found: must be either a file or a directory under packages`);
            return;
        }
        console.log(`Deploying ${action}`);
        await deploy(action);
        process.exit(0);
    } else {
        program.help();
    }
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});

setInterval(() => {}, 1000);