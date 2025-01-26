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

import {$} from "bun";
import {SecretResponse} from "./secrets.entities";

export class Secrets {

    /**
     * Parses command-line arguments into a key-value object for add/remove operations.
     */
    public static parseArguments(args: string[], operation: "add" | "remove"): Record<string, string> {
        const result: Record<string, string> = {};
        if (operation === "add") {
            let currentKey: string | null = null;
            let currentValue = "";

            for (const arg of args) {
                if (arg.includes("=")) {
                    if (currentKey !== null) {
                        result[currentKey] = currentValue.trim();
                    }
                    const [key, value = ""] = arg.split("=", 2);
                    currentKey = key.toUpperCase().trim();
                    currentValue = value;
                } else {
                    currentValue += ` ${arg}`;
                }
            }

            if (currentKey !== null) {
                result[currentKey] = currentValue.trim();
            }
        } else if (operation === "remove") {
            for (const arg of args) {
                result[arg.toUpperCase().trim()] = "";
            }
        }
        return result;
    }

    public static printTable(title: string, obj: Record<string, string>): string {
        try {
            const keys = Object.keys(obj);
            const maxKeyLength = Math.max(...keys.map(k => k.length));
            const maxValueLength = Math.max(...keys.map(k => obj[k].length));
            const totalWidth = maxKeyLength + maxValueLength + 7;

            let output = "";
            output += `\n${title}\n`;
            output += "-".repeat(totalWidth) + "\n";
            output += `| ${"Key".padEnd(maxKeyLength)} | ${"Value".padEnd(maxValueLength)} |\n`;
            output += "-".repeat(totalWidth) + "\n";

            keys.forEach(key => {
                output += `| ${key.padEnd(maxKeyLength)} | ${obj[key].padEnd(maxValueLength)} |\n`;
            });

            output += "-".repeat(totalWidth) + "\n";
            return output;
        } catch (err) {
            return '';
        }
    }

    /**
     * Escapes shell arguments for safe execution.
     */
    public static escapeShellArg(value: string): string {
        return `"${value.replace(/(["\\$`])/g, '\\$1')}"`;
    }

    /**
     * Run a command and return false if error or stdout on success
     * @param command
     * @param args
     */
    public static async runOps(args: string): Promise<boolean | string> {
        try {
            const OPS = process.env["OPS_CMD"] || null;
            const ARGS = args.length > 0 ? " " + args.concat(" ") : "";
            
            const result = await $`$OPS_CMD ${{ raw: ARGS}}`.text()
            return result;
        } catch (err) {
            return false;
        }
    }

    /**
     * Executes a configuration operation using the ops CLI.
     */
    public static async opsConfig(key: string, value: string): Promise<boolean> {
        try {
            const k = key.toUpperCase().trim();
            const v = value.trim();
            if (v.length > 0) {
                const escapedValue = Secrets.escapeShellArg(value);
                await Secrets.runOps(`-config ${k}=${escapedValue}`);
            } else {
                await Secrets.runOps(`-config -r ${k}`);
            }
            return true;
        } catch (err) {
            return false;
        }
    }

    public static async checkEnv(env: Record<string, string>, sysenv, warn = true): boolean {

        let result = true;
        try {
            const output = await Secrets.runOps('-config -d');            
            const lines = String(output).split("\n");            
            const opsKeys: string[] = [];
            // build the array of local configuration
            for (const line of lines) {
                if (line.indexOf("=") > -1) {
                    const lineItems = line.split("=");
                    if (lineItems[0])
                        opsKeys.push(lineItems[0]);
                }
            }
            // check if each env is in local configuration
            for (const envKey in env) {
                if (!opsKeys.includes(envKey)) {
                    //console.log(envKey);
                    // we missed this in local config
                    result = false;
                    break;
                }
            }

            if (!result) {
                if (warn) console.log('WARNING: Your local env is out of sync. Repeat ops -login to sync.');
                return false;
            }
            return true;
        } catch (err) {
            console.log(err);
            return false;
        }
    }


    /**
     * Makes a request to the secrets API.
     */
    public static async requestSecrets(operation: string, username: string, apihost: string, secrets?: Record<string, string>): Promise<SecretResponse> {
        const apiUrl = `${apihost}/api/v1/web/whisk-system/nuv/secrets`;
        const AUTH = process.env['AUTH'] || '';
        const response = await fetch(apiUrl, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `${AUTH}`
            },
            body: JSON.stringify({login: username, env: secrets})
        });

        if (!response.ok) {
            throw new Error(`Failed to ${operation} secrets: ${await response.text()}`);
        }

        return response.json();
    }
}
