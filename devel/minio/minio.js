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

function isRegExp(regExp){
    try {
          new RegExp(regExp);
        } catch(e) {
          return false
        }
   return true
}

function decode_and_norm(value) {
    let decoded = atob(value);
    return decoded.replace(/(\r\n|\n|\r)/gm,"");
}

async function main() {
    const opspwd = process.env.OPS_PWD
    const auth = process.env.AUTHB64
    const minioAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/minio`;
    const uploadAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/devel_upload`;
    const downloadAddr = `${process.env.APIHOST}/api/v1/web/whisk-system/nuv/devel_download`;

    let command = process.argv[2]
    let cmd = {}
    let bucket;
    let file;
    let dest_bucket;
    let dest_file;
    let localfile;
    let pattern;
    let dry_run;

    let format;
    if (['ls','lsb'].indexOf(command) !== -1) {
        if (command === 'ls') {
            format = Bun.argv[3];
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

    if ('ls' === command) {
        cmd['command']="ls"    
    }


    if ('lsb' === command) {
        bucket = decode_and_norm(process.argv[3])
        cmd['command'] = "ls"
        cmd['args'] = [bucket]
    }

    if ('rm' === command) {
        bucket = decode_and_norm(process.argv[3])
        file = decode_and_norm(process.argv[4])
        cmd['command']="rm"
        cmd['args']=[bucket,file]
    }


    if ('mv' === command) {
        bucket = decode_and_norm(process.argv[3])
        file = decode_and_norm(process.argv[4])
        dest_bucket = decode_and_norm(process.argv[5])
        dest_file = decode_and_norm(process.argv[6])

        cmd['command'] = "mv"
        cmd['args'] = [bucket, file, dest_bucket, dest_file]
    }  
    
    if ('cp' === command) {
        bucket = decode_and_norm(process.argv[3])
        file = decode_and_norm(process.argv[4])
        dest_bucket = decode_and_norm(process.argv[5])
        dest_file = decode_and_norm(process.argv[6])

        cmd['command']="cp"
        cmd['args']=[bucket,file,dest_bucket,dest_file]
    }  
    
    if ('put' === command) {
        localfile = decode_and_norm(process.argv[3])
        bucket = decode_and_norm(process.argv[4])
        file = decode_and_norm(process.argv[5])
        console.log(localfile, bucket, file);
    }
    
    if ('get' === command) {
        bucket = decode_and_norm(process.argv[3])
        file = decode_and_norm(process.argv[4])
    }

    if ('clean' === command) {
        bucket = decode_and_norm(process.argv[3])
        pattern = decode_and_norm(process.argv[4])
        dry_run = decode_and_norm(process.argv[5])

        console.log(`dryrun=${dry_run}`)

        if (!isRegExp(pattern)) {
            console.log(`pattern ${pattern} it is not a valid regular expression. Aborting execution`)
            return
        }

        cmd['command']="clean"
        cmd['args']=[bucket, pattern, dry_run]
    }

    try {

        if (command !== "put" && command !== "get") {

            const init = {
                method: "POST",
                body: JSON.stringify(cmd),
                headers: {'x-impersonate-auth': `${auth}`, 'Content-Type': 'application/json'},
            };
            const response = await fetch(`${minioAddr}`, init);

            const contentType = response.headers.get('Content-Type');
            const isJson = contentType && contentType.includes('application/json')
            let outputData = '';
            if (isJson) {
                outputData = await response.json();
            } else {
                outputData = await response.text();
            }
            if (format === 'table' && isJson && outputData!=='') {
                outputData = Bun.inspect.table(outputData);
            }
            console.log(outputData);
            return;
        }

        if (command === "put") {
            const bunfile = Bun.file(localfile);
            if (bunfile.exists()) {
                const init = {
                    method: "PUT",
                    body: bunfile,
                    headers: {'x-impersonate-auth': `${auth}`, 'Content-Type': 'application/json'},
                };
                const response = await fetch(`${uploadAddr}/${bucket}/${file}`, init);

                console.log(await response.text());
            } else {
                console.log(`invalid filename ${localfile} provided`)
            }
            return;
        }

        if (command === "get") {
            let split = file.split("/")
            let output_file = split[split.length - 1]
            console.log(output_file);

            const init = {
                method: "GET",
                body: file,
                headers: {'x-impersonate-auth': `${auth}`},
            };
            const response = await fetch(`${downloadAddr}/${bucket}/${file}`, init);
            const out_file = `${opspwd}/${output_file}`;
            await Bun.write(out_file, response);

        }
    } catch (err) {
        console.error(`[ERROR]: ${err.message}`);
    }


}
