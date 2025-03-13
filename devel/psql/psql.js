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

// *** Main ***
main();

/**
 * Print usage and exit
 */
function usage() {
    console.log("psql.js [describe|sql] [table|sql] [--format=json|table]")
    process.exit(1);

}

async function main() {
    const auth = process.env.AUTHB64
    const psqlAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/psql`;

    const command = Bun.argv[2]
    let param = atob(Bun.argv[3])
    param = param.replace(/(\r\n|\n|\r)/gm, "")

    const cmd = {}

    if ('desc' === command) {
        cmd['command'] = `SELECT column_name, data_type
                          FROM information_schema.columns
                          WHERE table_name = '${param}'`
    }

    if ('sql' === command) {
        cmd['command'] = param
    }

    let format = Bun.argv[4];

    if (!format) {
        format = 'json';
    }
    if (['json', 'table'].indexOf(format) === -1) {
        console.log(Bun.argv.length, Bun.argv);
        console.log(`Unsupported output format ${format}`);
        usage();
    }

    try {
        const response = await fetch(`${psqlAddr}`, {
            method: "POST",
            body: JSON.stringify(cmd),
            headers: {'x-impersonate-auth': `${auth}`},
        });

        if (format === 'table') {
            const tableData = await response.json();
            console.log(Bun.inspect.table(tableData));
        } else {
            const resp = await response.text();
            console.log(resp);
        }
    } catch (err) {
        console.error(`[ERROR]: ${err.message}`);
    }
}
