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

import {argv} from "bun";
import {Secrets} from "./secrets.lib";

/**
 * Main function to handle the command-line interface.
 */
async function main() {
    if (argv.length < 5) {
        console.error("Usage: bun addsecret.js <username> <apihost> <operation> [<key>=<value>...|<format>]");
        process.exit(1);
    }

    // retrieve the operation
    const operation = argv[2];
    // retrieve the username
    const username = argv[3];
    // retrieve the apihost
    const apihost = argv[4];
    let format;

    if (operation === "list") {
        format = argv[5] || 'table';
    }

    // Collect additional arguments as key-value pairs
    const keyValueArgs = argv.slice(5);
    const secrets = Secrets.parseArguments(keyValueArgs, operation);

    if (!(["add", "remove", "list"]).includes(operation) ) {
        console.error(`Invalid operation: ${operation}`);
        process.exit(1);
    }

    try {
        const apiUrl = `${apihost}/api/v1/web/whisk-system/nuv/secrets`;

        const data = {
            login: username,
            env: secrets,
        };

        // Invoke the system action using the Openwhisk auth token
        const resp = await Secrets.requestSecrets(operation, username, apiUrl, secrets)

        const env = resp.env;
        const sysenv = Object.keys(resp).includes('sysenv') ? resp['sysenv'] : [];

        let output = "";
        let keyLength = 0;
        let isOpsOk = true;
        switch (operation) {
            case "add":
                const added = Object.keys(resp).includes('added') ? resp['added'] : [];
                const changed = Object.keys(resp).includes('changed') ? resp['changed'] : [];
                const keyLengthAdded = Object.keys(added).length || 0;
                const keyLengthChanged = Object.keys(changed).length || 0;
                keyLength = keyLengthAdded + keyLengthChanged;
                if (keyLength === 0) {
                    output += `No secret was added`;
                } else {
                    if (keyLengthAdded > 0) {
                        output += `${keyLengthAdded > 0 ? 'One secret' : keyLengthAdded + ' secrets'} added: ${added.join(', ')}\n`;
                    }
                    if (keyLengthChanged > 0) {
                        output += `${keyLengthChanged > 0 ? 'One secret' : keyLengthChanged + ' secrets'} changed: ${changed.join(', ')}\n`;
                    }

                    for (const a of [...added,...changed]) {
                        const v = secrets[a];
                        const opsResult = await Secrets.opsConfig(a, v);
                        if (!opsResult) {
                            isOpsOk = false;
                        }
                    }
                }
                break;
            case "remove":
                const removed = Object.keys(resp).includes('removed') ? resp['removed'] : [];
                keyLength = Object.keys(removed).length || 0;
                if (keyLength === 0) {
                    output += `No secret was removed`;
                } else {
                    for (const r of removed) {
                        const opsResult = await Secrets.opsConfig(r, "");
                        if (!opsResult) {
                            isOpsOk = false;
                        }
                    }
                    output += `${keyLength > 0 ? 'One secret' : keyLength + ' secrets'} removed: ${removed.join(', ')}\n`;
                }
                break;
            case "list":
                switch (format) {
                    case 'table':
                        output += Secrets.printTable("Current Env", env);
                        if (Object.keys(sysenv).length > 0) {
                            output += Secrets.printTable("Overwritten System Envs", sysenv);
                        }
                        break;
                    case 'json':
                        output += JSON.stringify(env, null, 2);
                        break;
                    case 'raw':
                        Object.keys(env).forEach(key => {
                            output += `${key}=${env[key]}\n`;
                        });
                        break;
                }
                break;
        }
        console.log(output);
        await Secrets.checkEnv(env, sysenv);
    } catch (error) {
        console.error("Error while making API request:", error);
        process.exit(1);
    }
    process.exit(0);
}

main();
