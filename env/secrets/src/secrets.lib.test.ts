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

import { expect, describe, it, spyOn } from "bun:test";
import { Secrets } from "./secrets.lib";
import { SecretResponse } from "./secrets.entities";


describe("Secrets.parseArguments", () => {
    it("should parse key=value pairs for add operation", () => {
        const args = ["KEY1=value1", "KEY2=value2"];
        const result = Secrets.parseArguments(args, "add");
        expect(result).toEqual({ KEY1: "value1", KEY2: "value2" });
    });

    it("should handle multi-word values", () => {
        const args = ["KEY1=value1", "multi word value", "KEY2=value2"];
        const result = Secrets.parseArguments(args, "add");
        expect(result).toEqual({ KEY1: "value1 multi word value", KEY2: "value2" });
    });

    it("should parse keys for remove operation", () => {
        const args = ["KEY1", "KEY2"];
        const result = Secrets.parseArguments(args, "remove");
        expect(result).toEqual({ KEY1: "", KEY2: "" });
    });

    it("should parse arguments with special characters", () => {
        const args = ["KEY1=value1$", "KEY2=va!@#lue2", "KEY3=Ci'è~ls"];
        const result = Secrets.parseArguments(args, "add");
        expect(result).toEqual({ KEY1: "value1$", KEY2: "va!@#lue2", KEY3: "Ci'è~ls" });
    });
});

describe("Secrets.escapeShellArg", () => {
    it("should escape shell special characters", () => {
        const input = "some $value";
        const escaped = Secrets.escapeShellArg(input);
        expect(escaped).toBe("\"some \\\$value\"");
    });
});

describe("Secrets.printTable", () =>{
    it("should print a table", ()=>{
        const table = Secrets.printTable("test",{"MY_TESTING_KEY":"MY_TESTING_VALUE"});
        expect(table).toContain("test");
        expect(table).toContain("MY_TESTING_KEY");
    });
    it("should print an empty string", ()=>{
        const table = Secrets.printTable("test", {});
        expect(table).toEqual("");

    });
});

describe("Secrets.opsConfig", () => {


    it("should call OPSBIN with correct arguments when value is provided", async () => {
        const mock = spyOn(Secrets, 'runOps').mockImplementation(async () => {
            return '';
        });
        const result = await Secrets.opsConfig("testKey", "testValue");
        expect(result).toBe(true);        
        mock.mockRestore();
    });

    it("should call OPSBIN with removal flag when value is empty", async () => {
        const mock = spyOn(Secrets, 'runOps').mockImplementation(async () => {
            return '';
        });
        const result = await Secrets.opsConfig("testKey", "");
        expect(result).toBe(true);
        mock.mockRestore();

    });

    it("should return false on failure", async () => {
        const mock = spyOn(Secrets, 'runOps').mockImplementation(() => {
            throw new Error()
        });

        const result = await Secrets.opsConfig("testKey", "testValue");
        expect(result).toBe(false);
        mock.mockRestore();
    });
});

describe("Secrets.requestSecrets", () => {
    it("should send a request with the correct payload and return response", async () => {
        const mockResponse: SecretResponse = { added: [], changed: [], removed: [], env: {} };

        const mockFetch = spyOn(globalThis, "fetch").mockResolvedValue({
            ok: true,
            json: async () => mockResponse,
        } as Response);

        const result = await Secrets.requestSecrets(
            "update",
            "testUser",
            "https://example.com",
            { SECRET_KEY: "value" }
        );

        expect(result).toEqual(mockResponse);
        expect(mockFetch).toHaveBeenCalledWith(
            "https://example.com/api/v1/web/whisk-system/nuv/secrets",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": expect.any(String), // AUTH is from env
                },
                body: JSON.stringify({ login: "testUser", env: { SECRET_KEY: "value" } }),
            }
        );

        mockFetch.mockRestore(); // Correct way to restore the spy
    });

    it("should throw an error when the request fails", async () => {
        // Mock fetch for failure case
        const mockFetch = spyOn(globalThis, "fetch").mockResolvedValue({
            ok: false,
            text: async () => "Internal Server Error",
        } as Response);

        await expect(
            Secrets.requestSecrets("update", "testUser", "https://example.com")
        ).rejects.toThrow("Failed to update secrets");

        mockFetch.mockRestore(); 
    });
});

