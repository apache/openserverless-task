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

import process from "process";

const fs = require("fs");
import path from "path";
// *** Main ***
main();

/**
 * Print usage and exit
 */
function usage() {
    console.log("psql.js [describe|sql] [table|file] [--format=json|table]")
    process.exit(1);
}

/**
 * Read a file and return content as string.
 * If file doesn't exists, process will exit in error
 * @param filename
 * @returns {Promise<string>}
 */
async function getFile(filename) {
    let fullFileName = '';
    if (!path.isAbsolute(filename)) {
        fullFileName = [
            process.env.OPS_PWD,
            filename
        ].join(path.sep);
    } else {
        fullFileName = filename;
    }

    const file = Bun.file(fullFileName);
    if (!await file.exists()) {
        throw Error(`File ${fullFileName} doesn't exists`);
    }
    return await file.text();
}

async function main() {

    const auth = process.env.AUTHB64
    const psqlAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/psql`;

    // parse command line
    let command, param, format;

    command = String(Bun.argv[2]);
    if (Bun.argv[3] && Bun.argv[3].length > 0) {
        param = String(Bun.argv[3]);
        param = param.replace(/(\r\n|\n|\r)/gm, "");
    }
    format = (param && param.length > 0) ? Bun.argv[4] : Bun.argv[3];
    if (!format) {
        format = 'json';
    }

    if (['json', 'table'].indexOf(format) === -1) {
        console.log(`Unsupported output format ${format}`);
        usage();
    }

    // build the command for system action
    const cmds = []

    if ('describe' === command) {
        let tableInfo = param.split('.');
        const schema = tableInfo.length > 1 ? tableInfo[0] : process.env.OPSDEV_USERNAME;
        const table = tableInfo.length > 1 ? tableInfo[1] : tableInfo[0];
        let cmd = {}
        cmd['command'] = `SELECT table_catalog, table_schema, column_name, data_type, is_nullable 
                          FROM information_schema.columns
                          WHERE table_schema = '${schema}' and table_name='${table}'`;
        cmds.push(cmd);
    }

    if ('sql' === command) {
        // process data from stdin (if any)
        const isPipe = fs.fstatSync(0).isFIFO();
        let sql = '';
        if (isPipe) {
            for await (const chunk of Bun.stdin.stream()) {
                // chunk is Uint8Array - this converts it to text (assumes ASCII encoding)
                sql += Buffer.from(chunk).toString();
            }

        } else {
            sql = await getFile(param);
        }

        const queries = sql
            .split(/;\s*(?=(?:[^'"]*['"][^'"]*['"])*[^'"]*$)/)
            .map(query => query.trim())
            .filter(query => query.length > 0);
        for (const query of queries) {
            let cmd = {}
            cmd['command'] = query;
            cmds.push(cmd);
        }
    }

    // call the system action
    try {
        for (const cmd of cmds) {
            const response = await fetch(`${psqlAddr}`, {
                method: "POST",
                body: JSON.stringify(cmd),
                headers: {'x-impersonate-auth': `${auth}`},
            });

            // format the output
            let outputData = '';
            const contentType = response.headers.get('Content-Type');
            const isJson = contentType && contentType.includes('application/json')
            if (isJson) {
                outputData = await response.json();
            } else {
                outputData = await response.text();
            }
            if (format === 'table' && isJson && outputData.length > 0) {
                console.log(Bun.inspect.table(outputData));
            } else {
                console.log(outputData);
            }
        }
    } catch (err) {
        console.error(`[ERROR]: ${err.message}`);
    }
}
