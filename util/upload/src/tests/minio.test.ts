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
import { describe, it, expect, beforeEach, afterEach, jest } from "bun:test";
import { MinioUtils } from "./../lib/minio";
import { Result } from "./../lib/enums";
import * as minio from "minio";
import * as utils from "./../lib/utils";

// Mock the minio module
let minioClientMock: any;

// Create a mock ReadableStream
class MockReadableStream {
    private position: number = 0;

    constructor(public content: string) {}

    async *[Symbol.asyncIterator]() {
        yield this.content;
    }

    get size() {
        return this.content.length;
    }

    getReader() {
        return new MockReadableStreamReader(this);
    }
}

class MockReadableStreamReader {
    private position: number = 0;

    constructor(private stream: MockReadableStream) {}

    async read() {
        if (this.position < this.stream.size) {
            const chunk = this.stream.content[this.position];
            this.position++;
            return { value: chunk, done: false };
        } else {
            return { done: true };
        }
    }

    releaseLock() {
        // Implement as needed for your tests
    }
}

beforeEach(() => {
    // Create a mock object for minioClient methods
    minioClientMock = {
        listObjectsV2: jest.fn().mockReturnValue({
            [Symbol.asyncIterator]: async function* () {
                yield { name: "test-object-1" };
                yield { name: "test-object-2" };
            },
        }),
        removeObjects: jest.fn(),
        putObject: jest.fn(),
        removeObject: jest.fn(),
        statObject: jest.fn(),
    };

    // Use jest.spyOn to mock the minio.Client constructor
    jest.spyOn(minio, 'Client').mockImplementation(() => minioClientMock);

    // Mock process.stdout.write
    jest.spyOn(process.stdout, 'write').mockImplementation(() => {});

    // Mock the toBuffer function
    jest.spyOn(utils, 'toBuffer').mockImplementation(async (stream: ReadableStream) => {
        return new Buffer('file-content');
    });
});

afterEach(() => {
    // Restore all mocks after each test
    jest.restoreAllMocks();
});

describe("minio.ts", () => {
    let minioUtils: MinioUtils;
    const programOptions = {
        "--verbose": false,
    };
    const bucketName = "test-bucket";

    beforeEach(() => {
        // Initialize MinioUtils with the mocked minio.Client
        minioUtils = new MinioUtils({}, programOptions, bucketName);
    });

    it("should clean the bucket successfully", async () => {
        // Mock removeObjects to resolve without error
        minioClientMock.removeObjects.mockResolvedValue(undefined);

        await minioUtils.cleanBucket();

        // Check if listObjectsV2 was called correctly
        expect(minioClientMock.listObjectsV2).toHaveBeenCalledWith(bucketName, "", true);

        // Check if removeObjects was called with correct object names
        expect(minioClientMock.removeObjects).toHaveBeenCalledWith(bucketName, [
            "test-object-1",
            "test-object-2",
        ]);
    });

    it("should handle cleanBucket with no objects in the bucket", async () => {
        // Mock listObjectsV2 to return an empty iterable
        minioClientMock.listObjectsV2.mockReturnValue({
            [Symbol.asyncIterator]: async function* () {},
        });

        await minioUtils.cleanBucket();

        // Ensure removeObjects is not called since there are no objects
        expect(minioClientMock.removeObjects).not.toHaveBeenCalled();
    });

    it("should upload content successfully", async () => {
        // Mock the Bun.file
        const fileContent = "file-content";
        const mockBuffer = Buffer.from(fileContent);
        const mockFile = {
            stream: () => new MockReadableStream(fileContent),
            size: fileContent.length,
            type: "text/plain",
        };

        global.Bun.file = jest.fn().mockReturnValue(mockFile);

        minioClientMock.putObject.mockResolvedValue(undefined);

        const result = await minioUtils.uploadContent("file.txt", "fileAddr");

        expect(result).toBe(Result.COMPLETED);
        expect(minioClientMock.putObject).toHaveBeenCalledWith(
            bucketName,
            "fileAddr",
            mockBuffer,
            mockFile.size,
            { "Content-Type": "text/plain" }
        );
    });

    it("should handle uploadContent failure and retry", async () => {
        const fileContent = "file-content";
        const mockBuffer = Buffer.from(fileContent);
        const mockFile = {
            stream: () => new MockReadableStream(fileContent),
            size: fileContent.length,
            type: "text/plain",
        };

        global.Bun.file = jest.fn().mockReturnValue(mockFile);

        // Mock putObject to throw an error simulating ConnectionClosed
        minioClientMock.putObject.mockRejectedValueOnce({ code: "ConnectionClosed" });
        minioClientMock.putObject.mockResolvedValueOnce(undefined);

        const result = await minioUtils.uploadContent("file.txt", "fileAddr");

        expect(result).toBe(Result.COMPLETED);
        expect(minioClientMock.putObject).toHaveBeenCalledTimes(2);
    });

    it("should delete content successfully", async () => {
        // Mock existsContent to return Result.EXISTS
        jest.spyOn(minioUtils, "existsContent").mockResolvedValue(Result.EXISTS);

        // Mock removeObject to resolve without error
        minioClientMock.removeObject.mockResolvedValue(undefined);

        const result = await minioUtils.deleteContent("fileAddr");

        expect(result).toBe(Result.COMPLETED);
        expect(minioClientMock.removeObject).toHaveBeenCalledWith(bucketName, "fileAddr", {
            forceDelete: true,
        });
    });

    it("should skip deleting non-existent content", async () => {
        // Mock existsContent to return Result.DOESNT_EXISTS
        jest.spyOn(minioUtils, "existsContent").mockResolvedValue(Result.DOESNT_EXISTS);

        const result = await minioUtils.deleteContent("fileAddr");

        expect(result).toBe(Result.SKIPPED);
        expect(minioClientMock.removeObject).not.toHaveBeenCalled();
    });
});

