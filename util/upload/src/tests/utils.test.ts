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
import {afterEach, beforeEach, describe, expect, it, jest} from "bun:test";
import {Result} from "./../lib/enums";
import * as utils from "./../lib/utils";


describe("utils.ts", () =>{

    let mockConsoleError: jest.SpyInstance;

    beforeEach(() => {
        // Spy on console.error before each test
        mockConsoleError = jest.spyOn(global.console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        // Restore console.error after each test
        mockConsoleError.mockRestore();
    });

    // Mock process.exit and console.error for testing purposes
    const mockExit = jest.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
    });


    describe('error function', () => {
        it('should log the error message and return 1', () => {
            const result = utils.logError('Test error message');
            expect(mockConsoleError).toHaveBeenCalledWith('Test error message');
            expect(result).toBe(1);
        });
    });

    describe('parseResults function', () => {

        it('should correctly increment the counter based on the result type', () => {
            const counter = { files: 4, completed: 0, errors: 0, skipped: 0 };
            const results = [Result.COMPLETED, Result.ERROR, Result.SKIPPED, Result.COMPLETED];

            const updatedCounter = utils.parseResults(results, counter);

            expect(updatedCounter).toEqual({
                files: 4,
                completed: 2,
                errors: 1,
                skipped: 1
            });
        });
    });

    describe('getEnv function', () => {
        beforeEach(() => {
            mockConsoleError.mockClear();
            mockExit.mockClear();
        });

        it('should return the environment variable if it exists', () => {
            process.env.TEST_ENV = 'someValue';
            const result = utils.getEnv('TEST_ENV');
            expect(result).toBe('someValue');
        });

        it('should call error and exit the process if the env variable is missing', () => {
            delete process.env.TEST_ENV;
            expect(() => utils.getEnv('TEST_ENV')).toThrow('process.exit called');
            expect(mockConsoleError).toHaveBeenCalledWith('required TEST_ENV environment variable is not set!');
            expect(mockExit).toHaveBeenCalledWith(1);
        });
    });

    describe('toBuffer function', () => {
        it('should concatenate readable stream data into a buffer', async () => {
            const readableStream = new ReadableStream({
                start(controller) {
                    controller.enqueue(new Uint8Array([1, 2, 3]));
                    controller.enqueue(new Uint8Array([4, 5, 6]));
                    controller.close();
                }
            });

            const buffer = await utils.toBuffer(readableStream);
            expect(buffer).toEqual(Buffer.from([1, 2, 3, 4, 5, 6]));
        });
    });

    describe('extractUrlParts function', () => {
        it('should return correct URL parts for a valid HTTP URL', () => {
            const url = 'http://example.com:8080';
            const result = utils.extractUrlParts(url);

            expect(result).toEqual({
                protocol: 'http',
                host: 'example.com',
                port: 8080,
            });
        });

        it('should return correct URL parts for a valid HTTPS URL without a port', () => {
            const url = 'https://example.com';
            const result = utils.extractUrlParts(url);

            expect(result).toEqual({
                protocol: 'https',
                host: 'example.com',
                port: 443,
            });
        });

        it('should return null and log an error for an invalid URL', () => {
            const result = utils.extractUrlParts('invalid-url');
            expect(result).toBeNull();
            expect(mockConsoleError).toHaveBeenCalledWith(expect.stringContaining('Invalid URL:'));
        });
    });

});
