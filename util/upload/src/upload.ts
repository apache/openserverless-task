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

import {Glob} from "bun";
import type {Counter} from "./lib/types.ts";
import {Result} from "./lib/enums.ts";
import {extractUrlParts, getEnv, parseDocopt, parseResults} from "./lib/utils.ts";
import {MinioUtils} from "./lib/minio.ts";

const fs = require('node:fs/promises');

const { performance } = require('perf_hooks');

// Env

const s3ApiUrl = getEnv('S3_API_URL');

const s3UrlParts = extractUrlParts(s3ApiUrl);
if (s3UrlParts==null || s3UrlParts==undefined) {
    console.error(`Invalid S3 Api Url ${s3ApiUrl}`);
    process.exit(1);
}
const s3Host = s3UrlParts.host;
const s3Port = s3UrlParts.port;
const s3UseSsl = s3UrlParts.protocol.indexOf('https') >-1;

const s3AccessKey = getEnv('S3_ACCESS_KEY');
const s3Bucket = getEnv('S3_BUCKET_STATIC');
const s3SecretKey = getEnv('S3_SECRET_KEY');
const programOptions = parseDocopt();

const minioUtils = new MinioUtils({
    endPoint: s3Host,
    port: s3Port,
    useSSL: s3UseSsl,
    accessKey: s3AccessKey,
    secretKey: s3SecretKey,
}, programOptions, s3Bucket);



// *** Main ***
main().then((res) => {
    process.exit(res);
});

export async function main() {

    const startTime = performance.now();

    const path = programOptions["<path>"];
    const batchSize = programOptions["--batchsize"];

    let promiseBatch: Promise<Result>[] = [];
    const counter: Counter = {
        files: 0,
        skipped: 0,
        completed: 0,
        errors: 0
    };

    // delete flag
    if (programOptions["--clean"]) {
        await minioUtils.cleanBucket();
    }

    if (path === null || path === undefined) {
        if (programOptions["--verbose"]) {
            console.log("Path is not set");
        }
        return 0;
    }

    // Check if path exists
    const pathFoundAsDir = await fs.exists(path);
    if (!pathFoundAsDir) {
        console.error(`ERROR: ${path} is not a directory`);
        return;
    }

    // list files in path recursively
    const glob = new Glob(`${path}/**/*`);

    for await (const file of glob.scan({onlyFiles: true})) {

        // remove path from folder and prepend the result to entry
        let fileAddr = file.substring(path.length + 1);
        if (fileAddr.startsWith("/")) {
            fileAddr = fileAddr.substring(1);
        }

        const promise: Promise<Result> = (async () => {
            counter.files++;

            // upload command
            const fileItem = Bun.file(file);
            if (fileItem.size > 0) {
                return await minioUtils.uploadContent(file, fileAddr);
            } else {
                console.log(`Skipped empty file ${file}`);
                return await new Promise((resolve) => {
                    resolve(Result.SKIPPED);
                });
            }

        })();

        promiseBatch.push(promise);

        // If the batch size reaches batchSize, wait for them to resolve
        if (promiseBatch.length === batchSize) {
            const results = await Promise.all<Result>(promiseBatch);
            parseResults(results, counter);
            promiseBatch = []; // clear the batch
        }
    }
    // Process remaining promises (if any) in the last batch
    if (promiseBatch.length > 0) {
        const results = await Promise.all<Result>(promiseBatch);
        parseResults(results, counter);
    }

    const endTime = performance.now();
    const executionTime = endTime - startTime;

    console.log(`==================| UPLOAD RESULTS |==================`);
    console.log(`| FILES      : ${counter.files}`);
    console.log(`| COMPLETED  : ${counter.completed}`);
    console.log(`| ERRORS     : ${counter.errors}`);
    console.log(`| SKIPPED    : ${counter.skipped}`);
    console.log(`| EXEC. TIME : ${executionTime.toFixed(2)} ms`);
    console.log("======================================================");

    return 0;
}
