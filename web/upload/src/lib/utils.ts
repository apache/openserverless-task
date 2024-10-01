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

import type {Counter, ProgramOptions, UrlParts} from "./types.ts";
import {Result} from "./enums.ts";
import {docopt} from "docopt";

export function parseDocopt(): ProgramOptions {
    const doc=`Synchronize file from a local path to upload or delete static contents from user's minio bucket.
Usage:
    upload.ts <path> [--clean] [--verbose] [--batchsize=1]
    `;
    return docopt(doc);
}

export function logError(message: string) {
    console.error(message);
    return 1;
}

export function parseResults(results: Result[], counter: Counter) {
    for (let i = 0; i < results.length; i++) {
        switch (results[i]) {
            case Result.COMPLETED:
                counter.completed++;
                break;
            case Result.ERROR:
                counter.errors++;
                break;
            case Result.SKIPPED:
                counter.skipped++;
                break;
        }
    }
    return counter;
}

export function getEnv(key: string): string {
    const result = process.env[key] || null;
    if (result===null) {
        logError(`required ${key} environment variable is not set!`);
        process.exit(1);
    }
    return result as string;
}

export async function toBuffer(stream: ReadableStream): Promise<Buffer> {
    const list = []
    const reader = stream.getReader();
    while (true) {
        const {value, done} = await reader.read();
        if (value)
            list.push(value)
        if (done)
            break
    }
    return Buffer.concat(list)
}

export function extractUrlParts(urlString: string): UrlParts | null {
    try {
        // Use the URL constructor to parse the URL
        const url = new URL(urlString);

        // Extract the protocol, hostname (host), and port
        const protocol = url.protocol; // includes the ':' at the end
        const host = url.hostname;     // host without port
        const port = url.port || (protocol === 'https:' ? '443' : '80'); // default ports
        const protocolWithoutColon = protocol.replace(':', ''); // if you want protocol without ':'

        return {
            protocol: protocolWithoutColon,
            host: host,
            port: Number(port)
        };
    } catch (error) {
        logError(`Invalid URL: ${error}`);
        return null;
    }
}

