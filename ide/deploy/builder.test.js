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

import {afterEach, describe, expect, test} from "bun:test";
import fs from "fs/promises";
import os from "os";
import path from "path";

import {ensureRuntimeProfiles, loadRuntimeProfiles} from "./builder.js";
import {appendRuntimeImage} from "./deploy.js";

const temporaryDirectories = [];

async function project(profile = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), "ops-builder-test-"));
  temporaryDirectories.push(directory);
  await fs.writeFile(
    path.join(directory, "package.json"),
    JSON.stringify({openserverless: {runtimeProfiles: profile}}),
  );
  await fs.mkdir(path.join(directory, "runtime"));
  await fs.writeFile(path.join(directory, "runtime", "python.txt"), "sample-lib==1.0\n");
  return directory;
}

function response(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {"content-type": "application/json"},
  });
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((directory) => fs.rm(directory, {recursive: true})));
});

describe("runtime profile builder", () => {
  test("adds a generated image without replacing an explicit docker argument", () => {
    expect(appendRuntimeImage("--web true", "registry.example/sample:image")).toBe(
      "--web true --docker registry.example/sample:image",
    );
    expect(appendRuntimeImage("--docker explicit/image:tag --web true", "generated/image:tag")).toBe(
      "--docker explicit/image:tag --web true",
    );
  });

  test("polls until the image is ready and maps it to the action", async () => {
    const directory = await project({
      "python-custom": {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/custom"],
      },
    });
    const replies = [
      response(202, {state: "queued", id: "a".repeat(64)}),
      response(202, {state: "running", id: "a".repeat(64)}),
      response(200, {
        state: "succeeded",
        id: "a".repeat(64),
        image: "registry.example:32000/sample:python-digest",
      }),
    ];
    const requests = [];

    const images = await ensureRuntimeProfiles(null, {
      projectDir: directory,
      credentials: {apiHost: "https://api.example", auth: "uuid:key"},
      fetchImpl: async (url, options) => {
        requests.push({url, options});
        return replies.shift();
      },
      sleep: async () => {},
      pollInterval: 0,
    });

    expect(images.get("samples/custom")).toBe(
      "registry.example:32000/sample:python-digest",
    );
    expect(requests).toHaveLength(3);
    expect(JSON.parse(requests[0].options.body).builder).toBe("python:3.13");
  });

  test("uses an immediate server cache hit without polling", async () => {
    const directory = await project({
      cached: {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/cached"],
      },
    });
    let calls = 0;

    const images = await ensureRuntimeProfiles(null, {
      projectDir: directory,
      credentials: {apiHost: "https://api.example", auth: "uuid:key"},
      fetchImpl: async () => {
        calls += 1;
        return response(200, {
          state: "succeeded",
          image: "registry.example:32000/sample:python-cached",
        });
      },
    });

    expect(calls).toBe(1);
    expect(images.get("samples/cached")).toEndWith("python-cached");
  });

  test("dry-run validates profiles without contacting the server", async () => {
    const directory = await project({
      dry: {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/dry"],
      },
    });

    const images = await ensureRuntimeProfiles(null, {
      projectDir: directory,
      dryRun: true,
      fetchImpl: async () => {
        throw new Error("fetch must not be called");
      },
    });

    expect(images.size).toBe(0);
  });

  test("rejects actions assigned to multiple profiles", async () => {
    const directory = await project({
      first: {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/shared"],
      },
      second: {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/shared"],
      },
    });

    await expect(loadRuntimeProfiles({projectDir: directory})).rejects.toThrow(
      "assigned to more than one runtime profile",
    );
  });

  test("propagates a failed remote build", async () => {
    const directory = await project({
      broken: {
        builder: "python:3.13",
        requirements: "runtime/python.txt",
        actions: ["samples/broken"],
      },
    });

    await expect(ensureRuntimeProfiles(null, {
      projectDir: directory,
      credentials: {apiHost: "https://api.example", auth: "uuid:key"},
      fetchImpl: async () => response(409, {state: "failed", message: "dependency install failed"}),
    })).rejects.toThrow("dependency install failed");
  });
});
