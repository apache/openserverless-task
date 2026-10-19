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

import {test, expect} from "bun:test";
import {defaultUser, ingress, registrySecret, waitFor} from "./cluster-ready";
test("ingress requires a hostname, not just an object", async () => {
  await expect(ingress(async () => ({spec: {rules: []}}), 0)).rejects.toThrow("Timed out");
  await ingress(async () => ({spec: {rules: [{host: "lab.test"}]}}), 0);
});
test("missing ingress times out", async () => {
  await expect(ingress(async () => undefined, 0)).rejects.toThrow("Timed out");
});
test("API errors are not swallowed", async () => {
  await expect(ingress(async () => {throw new Error("Forbidden")}, 0)).rejects.toThrow("Forbidden");
});
test("disabled registry performs no config read or mutation", async () => {
  let calls = 0;
  await registrySecret(async () => {calls++;return {spec:{components:{registry:false}}}}, 0);
  expect(calls).toBe(1);
});
test("enabled registry without credentials times out without mutating", async () => {
  const calls: string[][] = [];
  await expect(registrySecret(async args => {
    calls.push(args);return args[1] === "whisk/controller" ? {spec:{components:{registry:true}}} : {metadata:{annotations:{}}};
  }, 0)).rejects.toThrow("registry credentials");
  expect(calls.every(args => args[0] === "get")).toBe(true);
});
test("credentials applied without delete or password in arguments", async () => {
  const calls: any[] = [];
  const kube = async (args: string[], input?: string) => {
    calls.push({args,input});
    if (args[1] === "whisk/controller") return {spec:{components:{registry:true}}};
    if (args[1] === "cm/config") return {metadata:{annotations:{registry_username:"custom",registry_password:"a b$!",registry_internal_host:"registry:5000"}}};
  };
  await registrySecret(kube, 0);
  await registrySecret(kube, 0);
  const mutations = calls.filter(x => x.input);
  expect(mutations.length).toBe(2);
  expect(calls.some(x => x.args[0] === "delete")).toBe(false);
  expect(JSON.stringify(calls.map(x=>x.args))).not.toContain("a b$!");
  const secret = JSON.parse(mutations[0].input);
  const config = JSON.parse(Buffer.from(secret.data[".dockerconfigjson"],"base64").toString());
  expect(config.auths["registry:5000"].password).toBe("a b$!");
  expect(config.auths["registry:5000"].username).toBe("custom");
});

test("delayed resource becomes available", async () => {
  let reads = 0;
  expect(await waitFor(async () => ++reads === 3 ? "ready" : undefined, "resource", 100, async () => {})).toBe("ready");
  expect(reads).toBe(3);
});
test("default user is created only when missing", async () => {
  let created = 0;
  await defaultUser(async () => created ? {status:{conditions:[{type:"Ready",status:"True"}]}} : undefined, async () => {created++}, 0);
  expect(created).toBe(1);
});
test("repeated setup preserves a ready default user's credentials and data", async () => {
  let created = 0;
  const calls: string[][] = [];
  await defaultUser(async args => {calls.push(args);return {status:{conditions:[{type:"Ready",status:"True"}]}}}, async () => {created++}, 0);
  expect(created).toBe(0);
  expect(calls.every(args => args[0] === "get")).toBe(true);
});
test("default user read errors do not trigger creation", async () => {
  let created = 0;
  await expect(defaultUser(async () => {throw new Error("Forbidden")}, async () => {created++}, 0)).rejects.toThrow("Forbidden");
  expect(created).toBe(0);
});
test("deleting default user is not recreated", async () => {
  let created = 0;
  await expect(defaultUser(async () => ({metadata:{deletionTimestamp:"2026-10-08"}}), async () => {created++}, 0)).rejects.toThrow("being deleted");
  expect(created).toBe(0);
});

test("new default user must become Ready before setup succeeds", async () => {
  let created=0;
  await expect(defaultUser(async () => created ? {status:{conditions:[{type:"Ready",status:"False"}]}} : undefined, async () => {created++}, 0)).rejects.toThrow("default user devel to become Ready");
  expect(created).toBe(1);
});
