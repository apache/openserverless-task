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

export type Kube = (args: string[], input?: string) => Promise<any>;
const pause = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
export async function waitFor(read: () => Promise<any>, description: string, timeout = 600_000, sleep = pause) {
  const deadline = Date.now() + timeout;
  do {
    const value = await read();
    if (value) return value;
    if (Date.now() >= deadline) break;
    await sleep(Math.min(2000, Math.max(0, deadline - Date.now())));
  } while (true);
  throw new Error(`Timed out waiting for ${description}`);
}
export async function ingress(kube: Kube, timeout?: number) {
  await waitFor(async () => {
    const obj = await kube(["get", "ingress/apihost", "--ignore-not-found", "-o", "json"]);
    return obj?.spec?.rules?.[0]?.host;
  }, "ingress/apihost with a hostname", timeout);
}
export async function defaultUser(kube: Kube, create: () => Promise<void>, timeout?: number) {
  const args = ["get", "wsku/devel", "--ignore-not-found", "-o", "json"];
  const existing = await kube(args);
  if (!existing) {
    await create();
  }
  if (existing?.metadata?.deletionTimestamp) throw new Error("Default user devel is being deleted; retry setup after deletion completes");
  await waitFor(async () => {
    const user = await kube(args);
    return user?.status?.conditions?.some((c: any) => c.type === "Ready" && c.status === "True");
  }, "default user devel to become Ready", timeout);
  console.log(existing ? "Default user devel already exists and is Ready; preserving its credentials and data." : "Default user devel is Ready.");
}
export async function registrySecret(kube: Kube, timeout?: number) {
  const whisk = await kube(["get", "whisk/controller", "-o", "json"]);
  if (whisk.spec.components.registry !== true) {
    console.log("Registry disabled; skipping registry build credentials.");
    return;
  }
  const annotations = await waitFor(async () => {
    const cm = await kube(["get", "cm/config", "--ignore-not-found", "-o", "json"]);
    const a = cm?.metadata?.annotations;
    return a?.registry_password ? a : undefined;
  }, "registry credentials from the operator", timeout);
  const username = annotations.registry_username || "opsuser";
  const password = annotations.registry_password;
  const host = annotations.registry_internal_host || "http://openserverless-registry-svc:5000";
  const config = {auths: {[host]: {username, password, auth: Buffer.from(`${username}:${password}`).toString("base64")}}};
  // Server-side apply avoids persisting a second credential copy in last-applied annotations.
  await kube(["apply", "--server-side", "--field-manager=ops-registry-credentials", "-f", "-"], JSON.stringify({
    apiVersion: "v1", kind: "Secret", metadata: {name: "registry-pull-secret-int", namespace: "openserverless"},
    type: "kubernetes.io/dockerconfigjson", data: {".dockerconfigjson": Buffer.from(JSON.stringify(config)).toString("base64")}
  }));
}
const kube: Kube = async (args, input) => {
  const p = Bun.spawn(["kubectl", "-n", "openserverless", ...args], {
    stdin: input === undefined ? "ignore" : new Blob([input]), stdout: "pipe", stderr: "pipe"
  });
  const [out, err, code] = await Promise.all([new Response(p.stdout).text(), new Response(p.stderr).text(), p.exited]);
  // Mutation errors can include the submitted Secret: do not print them.
  if (code !== 0) throw new Error(input ? "Unable to apply registry credentials (check Kubernetes permissions/field ownership)" : `kubectl failed: ${err.trim()}`);
  return input ? undefined : out.trim() ? JSON.parse(out) : undefined;
};
if (import.meta.main) {
  try {
    if (process.argv[2] === "ingress") await ingress(kube);
    else if (process.argv[2] === "registry-secret") await registrySecret(kube);
    else if (process.argv[2] === "default-user") await defaultUser(kube, async () => {
      const child = Bun.spawn([process.env.OPS_CMD || "ops", "setup", "openserverless", "add-user"], {
        stdin: "inherit", stdout: "inherit", stderr: "inherit"
      });
      if (await child.exited !== 0) throw new Error("Unable to create the default user devel");
    });
    else throw new Error("Expected ingress, registry-secret or default-user");
  } catch (e) { console.error(`ERROR: ${(e as Error).message}`); process.exitCode = 1; }
}
