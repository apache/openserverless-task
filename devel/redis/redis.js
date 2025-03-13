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

async function main() {
    const auth = process.env.AUTHB64
    const redisAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/redis`

    let decoded = atob(Bun.argv[2]);
    decoded = decoded.replace(/(\r\n|\n|\r)/gm,"")
    let cmd = {"command" : decoded };

    let format = Bun.argv[3];

    if (!format) {
        format = 'json';
    }
    if (['json', 'table'].indexOf(format) === -1) {
        console.log(Bun.argv.length, Bun.argv);
        console.log(`Unsupported output format ${format}`);
        usage();
    }

    try {
        const response = await fetch(`${redisAddr}`, {
            method: "POST",
            body: JSON.stringify(cmd),
            headers: {'x-impersonate-auth': `${auth}`, 'Content-Type': 'application/json'},
        });

        if (format === 'table') {
            const tableData = await response.json();
            console.log(Bun.inspect.table(tableData));
        } else {
            const resp = await response.text();
            console.log(resp);
        }
        process.exit(0);
    } catch (err) {
        console.error(err.message);
        process.exit(1);
    }
    

}
