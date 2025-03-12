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
import { parseArgs } from "util";
const fs = require("fs");

// *** Main ***
main();

/**
 * Read a file and return content as string.
 * If file doesn't exists, process will exit in error
 * @param filename
 * @returns {Promise<string>}
 */
async function getFile(filename) {
    const file = Bun.file(filename);
    if (!await file.exists()) {
        throw Error(`File ${filename} doesn't exists`);
    }
    return await file.text();
}

/**
 * Print usage and exit
 */
function usage() {
    console.log("ferretdb.js [find|submit|command] [filename] [--format=json|table]")
    process.exit(1);

}

/**
 * Main
 */
async function main() {
    const auth = process.env.AUTHB64
    const develAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/ferretdb`;


    // process command name
    const command = Bun.argv[2];

    // process third parameter data (if any). This can be collection name or a filename
    let param = '';
    if (Bun.argv[3] && Bun.argv[3].length > 0) {
        param = Bun.argv[3];
    }
    param = param.replace(/(\r\n|\n|\r)/gm, "");

    let format;
    if (['command','find'].indexOf(command) !== -1) {
        if (command === 'command') {
            format = Bun.argv.length === 5 ? Bun.argv[4] : Bun.argv[3];
        } else {
            format = Bun.argv[4];
        }
        if (!format) {
            format = 'json';
        }
        if (['json', 'table'].indexOf(format) === -1) {
            console.log(Bun.argv.length, Bun.argv);
            console.log(`Unsupported output format ${format}`);
            usage();
        }
    }

    let cmd;
    try {
        // example: `ops devel ferretdb find <collection_name>`
        if ('find' === command) {
            cmd = JSON.stringify({"find": `${param}`});
        }

        // example: `ops devel ferretdb delete <collection_name>`
        if ('delete' === command) {
            cmd = JSON.stringify({"delete": `${param}`, "deletes": [{ "q": {}, "limit": 0 }]});
        }

        // example: `ops devel ferretdb submit <collection_name> /path/to/jsonfile`
        if ('submit' === command) {
            const filename = Bun.argv[4] ;
            const data = await getFile(filename);
            cmd = JSON.stringify({"insert": `${param}`,"documents": JSON.parse(data) });
            console.log(cmd);
        }

        // example: `ops devel ferretdb command /path/to/file`
        //
        // or
        //
        // echo '{                                                                                                                                                                                                             (⎈|kind-nuvolaris:default)
        //   "find": "opstutorial",
        //   "filter": {
        //     "experience": { "$gte": 4 }
        //   }
        // }'" | ops devel ferretdb command
        if ('command' === command) {
            // process data from stdin (if any)
            const isPipe = fs.fstatSync(0).isFIFO();
            let data = '';
            if (isPipe) {
                for await (const chunk of Bun.stdin.stream()) {
                    // chunk is Uint8Array - this converts it to text (assumes ASCII encoding)
                    data += Buffer.from(chunk).toString();
                }
            } else {
                data = await getFile(param);
            }

            if (data.trim().length === 0) {
                console.error('No data from stdin or file');
                process.exit(1);
            }
            cmd = data
        }


        const init = {
            method: "POST",
            body: cmd,
            headers: {'x-impersonate-auth': `${auth}`},
        };
        const response = await fetch(`${develAddr}`, init);
        if (format==='table'){
            const tableData = await response.json();
            /*let headData = structuredClone(tableData);
            delete headData['cursor'];
            console.log(Bun.inspect.table(headData));*/
            if (tableData['cursor'] && tableData['cursor']['firstBatch']) {
                let bodyData = tableData['cursor']['firstBatch'];
                if (bodyData.length > 0)
                    console.log(Bun.inspect.table(bodyData));
            }
        } else {
            const resp = await response.text();
            console.log(resp);
        }
    } catch (err) {
        console.error(`[ERROR]: ${err.message}`);
    }
}
