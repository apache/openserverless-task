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

import {describe, expect, test} from "bun:test";
import {buildCatalog} from "./builders";

describe("system API builder catalog", () => {
  test("resolves a builder source from the versioned runtime catalog", () => {
    const result = buildCatalog(
      {runtimes: {python: [{
        kind: "python:3.13",
        image: {prefix: "apache", name: "openserverless-runtime-python", tag: "v3.13-test"},
      }]}},
      {builders: {"python:3.13": {kind: "python"}}},
    );

    expect(result.builders["python:3.13"]).toEqual({
      kind: "python",
      source: "docker.io/apache/openserverless-runtime-python:v3.13-test",
    });
  });

  test("fails when a declared builder is missing from runtimes.json", () => {
    expect(() => buildCatalog(
      {runtimes: {python: []}},
      {builders: {"python:3.13": {kind: "python"}}},
    )).toThrow("is not present");
  });
});
