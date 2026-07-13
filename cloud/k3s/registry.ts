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

const HOST = /^[A-Za-z0-9][A-Za-z0-9.-]*$/;
const USER = /^[A-Za-z0-9_][A-Za-z0-9_.-]*$/;

export function renderRegistryConfig(server: string): string {
  if (!HOST.test(server)) throw new Error(`invalid K3s server: ${server}`);
  return `# Managed by Apache OpenServerless\nmirrors:\n  "${server}:32000":\n    endpoint:\n      - "http://${server}:32000"\n`;
}

async function capture(args: string[]): Promise<{code: number; stdout: string; stderr: string}> {
  const process = Bun.spawn(args, {stdout: "pipe", stderr: "pipe"});
  const [stdout, stderr, code] = await Promise.all([
    new Response(process.stdout).text(),
    new Response(process.stderr).text(),
    process.exited,
  ]);
  return {code, stdout, stderr};
}

async function writeRemote(args: string[], content: string): Promise<void> {
  const process = Bun.spawn(args, {stdin: "pipe", stdout: "inherit", stderr: "inherit"});
  process.stdin.write(content);
  process.stdin.end();
  const code = await process.exited;
  if (code !== 0) throw new Error(`command failed (${code}): ${args.join(" ")}`);
}

async function configure(server: string, user: string): Promise<void> {
  if (!USER.test(user)) throw new Error(`invalid SSH user: ${user}`);
  const destination = `${user}@${server}`;
  const ssh = ["ssh", "-oStrictHostKeyChecking=no", destination];
  const expected = renderRegistryConfig(server);
  const current = await capture([...ssh, "sudo", "cat", "/etc/rancher/k3s/registries.yaml"]);
  if (current.code === 0 && current.stdout === expected) {
    console.log(`K3s registry already configured for ${server}:32000`);
    return;
  }
  if (current.code === 0 && current.stdout.trim()) {
    throw new Error(
      "/etc/rancher/k3s/registries.yaml already contains unmanaged configuration; refusing to overwrite it",
    );
  }

  const exists = await capture([
    ...ssh, "sudo", "test", "-e", "/etc/rancher/k3s/registries.yaml",
  ]);
  if (exists.code === 0) {
    throw new Error("cannot read the existing /etc/rancher/k3s/registries.yaml");
  }

  const directory = await capture([...ssh, "sudo", "mkdir", "-p", "/etc/rancher/k3s"]);
  if (directory.code !== 0) throw new Error(directory.stderr || "cannot create K3s config directory");
  await writeRemote(
    [...ssh, "sudo", "tee", "/etc/rancher/k3s/registries.yaml"],
    expected,
  );
  const restart = await capture([...ssh, "sudo", "systemctl", "restart", "k3s"]);
  if (restart.code !== 0) throw new Error(restart.stderr || "cannot restart K3s");

  for (let attempt = 0; attempt < 60; attempt += 1) {
    const active = await capture([...ssh, "sudo", "systemctl", "is-active", "k3s"]);
    if (active.code === 0 && active.stdout.trim() === "active") {
      console.log(`K3s registry configured for ${server}:32000`);
      return;
    }
    await Bun.sleep(1000);
  }
  throw new Error("K3s did not become active after registry configuration");
}

if (import.meta.main) {
  const args = Bun.argv.slice(2);
  if (args[0] === "--render") {
    console.log(renderRegistryConfig(args[1]));
  } else {
    const server = args[0];
    const user = args[1] || "root";
    if (!server) throw new Error("K3s server is required");
    await configure(server, user);
  }
}
