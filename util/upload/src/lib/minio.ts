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

import * as minio from "minio";
import {toBuffer} from "./utils.ts";
import {Result} from "./enums.ts";
import type {ProgramOptions} from "./types.ts";

export class MinioUtils {

    private minioClient: minio.Client;
    private bucket: string;
    private programOptions: ProgramOptions;

    constructor(clientOptions: minio.ClientOptions,
                programOptions: ProgramOptions,
                bucket: string) {
        this.minioClient = new minio.Client(clientOptions)
        this.programOptions = programOptions;
        this.bucket = bucket;
    }

    async cleanBucket(): Promise<void> {
        try {
            // List all objects in the bucket
            const objectsStream = this.minioClient.listObjectsV2(this.bucket, '', true);

            const objectNames: string[] = [];
            for await (const obj of objectsStream) {
                objectNames.push(obj.name); // Collect object names to delete
            }

            if (objectNames.length > 0) {
                // Delete objects in batches
                await this.minioClient.removeObjects(this.bucket, objectNames);
                if (this.programOptions["--verbose"])
                    console.log(`${objectNames.length} objects removed from bucket ${this.bucket}.`);
            } else {
                if (this.programOptions["--verbose"])
                    console.log(`No objects found in bucket ${this.bucket}.`);
            }
        } catch (err) {
            console.error(`Failed to clean bucket ${this.bucket}:`, err);
            throw err;
        }
    }

    async uploadContent(
        file: string,
        fileAddr: string
    ): Promise<Result> {

        let maxTries = 5;
        let result = Result.ERROR;
        let shouldContinue = true;
        do {
            const fileToUpload = Bun.file(file);
            const data = await toBuffer(fileToUpload.stream());
            let mimeType = fileToUpload.type;
            if (mimeType.indexOf(';') > -1) {
                mimeType = mimeType.substring(0, mimeType.indexOf(';'));
            }
            const metadata:  Record<string, string> = {
                'Content-Type': mimeType,
            }
            try {
                await this.minioClient.putObject(this.bucket, fileAddr, data, fileToUpload.size, metadata);
                if (this.programOptions["--verbose"])
                    console.log(`Upload ${fileAddr}: OK\n`);

                result = Result.COMPLETED;
                shouldContinue = false;

            } catch (error) {
                result = Result.ERROR;
                if ((error as { code?: string }).code == "ConnectionClosed") {
                    if (this.programOptions["--verbose"])
                        console.log(`Upload ${fileAddr}: KO: retry ${maxTries}\n`);
                    maxTries--;
                    Bun.sleep(25*maxTries);
                } else {
                    shouldContinue = false;
                    console.log(`Upload ${fileAddr}: KO: retry ${maxTries}\n`);
                }
            }
        }
        while (shouldContinue && maxTries > 0);

        return result
    }

    async deleteContent(
        fileAddr: string): Promise<Result> {

        try {
            const exists = await this.existsContent(fileAddr);
            if (exists !== Result.EXISTS) {
                if (exists === Result.DOESNT_EXISTS) return Result.SKIPPED;
                return exists;
            }

            await this.minioClient.removeObject(this.bucket, fileAddr, {forceDelete: true});
            if (this.programOptions["--verbose"])
                process.stdout.write(`Delete ${fileAddr}: OK\n`);
            return Result.COMPLETED;
        } catch (err) {
            if (this.programOptions["--verbose"])
                process.stdout.write(`Delete ${fileAddr}: KO\n`);
            return Result.ERROR;
        }
    }

    async existsContent(fileAddr: string): Promise<Result> {
        try {
            await this.minioClient.statObject(this.bucket, fileAddr);
            return Result.EXISTS;
        } catch (e) {
            if (e instanceof minio.S3Error) {
                if (e.code == "NotFound") {
                    if (this.programOptions["--verbose"])
                        process.stdout.write(`Delete ${fileAddr}: SKIPPED (file doesn't exists).\n`);
                    return Result.DOESNT_EXISTS;
                }
                return Result.ERROR;
            } else {
                return Result.ERROR;
            }
        }
    }
}
