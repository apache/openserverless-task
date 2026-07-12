/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { describe, expect, test } from "bun:test";
import {
  type CommandResult,
  type CommandRunner,
  type RunOptions,
  SSOManager,
} from "./sso";

interface RecordedCommand {
  command: string[];
  options: RunOptions;
}

class FakeRunner implements CommandRunner {
  readonly commands: RecordedCommand[] = [];
  readonly local: Record<string, string> = {};
  readonly resources = new Map<string, unknown>();

  constructor(public workload: any) {}

  async run(command: string[], options: RunOptions = {}): Promise<CommandResult> {
    this.commands.push({ command: [...command], options: { ...options } });
    if (command[0] === "test-ops" && command[1] === "-config") {
      return this.runConfig(command.slice(2));
    }
    if (command[0] !== "kubectl") throw new Error(`unexpected command: ${command.join(" ")}`);

    const action = command.includes("apply")
      ? "apply"
      : command.includes("get")
        ? "get"
        : command.includes("patch")
          ? "patch"
          : command.includes("delete")
            ? "delete"
            : command.includes("rollout")
              ? "rollout"
              : "unknown";
    switch (action) {
      case "apply": {
        const object = JSON.parse(options.stdin || "{}");
        this.resources.set(`${object.kind}/${object.metadata.name}`, object);
        return ok(`${object.kind.toLowerCase()}/${object.metadata.name} configured\n`);
      }
      case "get":
        return ok(JSON.stringify(this.workload));
      case "patch": {
        const payload = command[command.indexOf("-p") + 1];
        this.applyPatch(JSON.parse(payload));
        return ok("statefulset.apps/nuvolaris-system-api patched\n");
      }
      case "delete": {
        const kindIndex = command.findIndex((value) => value === "configmap" || value === "secret");
        const key = `${command[kindIndex] === "configmap" ? "ConfigMap" : "Secret"}/${command[kindIndex + 1]}`;
        this.resources.delete(key);
        return ok();
      }
      case "rollout":
        return ok();
      default:
        throw new Error(`unexpected kubectl command: ${command.join(" ")}`);
    }
  }

  private runConfig(args: string[]): CommandResult {
    if (args[0] === "-dump") {
      const stdout = Object.entries(this.local)
        .map(([key, value]) => `${key}=${value}`)
        .join("\n");
      return ok(stdout ? `${stdout}\n` : "");
    }
    if (args[0] === "--remove") {
      for (const key of args.slice(1)) delete this.local[key];
      return ok();
    }
    for (const pair of args) {
      const separator = pair.indexOf("=");
      this.local[pair.slice(0, separator)] = pair.slice(separator + 1);
    }
    return ok();
  }

  private applyPatch(operations: Array<{ op: string; path: string; value?: unknown }>): void {
    const envFrom = this.workload.spec.template.spec.containers[0].envFrom ?? [];
    for (const operation of operations) {
      const finalPart = operation.path.split("/").at(-1)!;
      if (operation.op === "test") {
        expect(envFrom[Number(finalPart)]).toEqual(operation.value);
      } else if (operation.op === "remove") {
        envFrom.splice(Number(finalPart), 1);
      } else if (operation.op === "add" && finalPart === "-") {
        envFrom.push(operation.value);
      } else if (operation.op === "add") {
        this.workload.spec.template.spec.containers[0].envFrom = structuredClone(operation.value);
      }
    }
    this.workload.spec.template.spec.containers[0].envFrom = envFrom;
  }
}

function ok(stdout = ""): CommandResult {
  return { stdout, stderr: "", exitCode: 0 };
}

function workload(envFrom: unknown[]): any {
  return {
    metadata: {
      name: "nuvolaris-system-api",
      annotations: { "external.example/owner": "platform" },
    },
    spec: {
      template: {
        metadata: { annotations: { "external.example/template": "preserve" } },
        spec: {
          containers: [
            {
              name: "nuvolaris-system-api",
              image: "example.test/admin-api:latest",
              env: [{ name: "APPLICATION_MODE", value: "production" }],
              envFrom,
              volumeMounts: [{ name: "application-data", mountPath: "/data" }],
            },
          ],
          volumes: [{ name: "application-data", emptyDir: {} }],
        },
      },
    },
  };
}

function keycloakEnvironment(overrides: Record<string, string> = {}): Record<string, string> {
  return {
    OPS: "test-ops",
    OPS_SSO_ENABLE: "true",
    OPS_SSO_ISSUER_URL: "https://keycloak.example.test/realms/openserverless",
    OPS_SSO_JWKS_URL: "https://keycloak.example.test/realms/openserverless/protocol/openid-connect/certs",
    OPS_SSO_CLIENT_ID: "openserverless-admin-api",
    OPS_SSO_CLIENT_SECRET: "test-secret",
    OPS_SSO_REQUIRED_GROUP: "openserverless-users",
    OPS_SSO_NO_ROLLOUT: "true",
    ...overrides,
  };
}

describe("config sso task", () => {
  test("preserves foreign workload fields across enable-disable-enable", async () => {
    const foreignEnvFrom = [
      { configMapRef: { name: "application-config" } },
      { secretRef: { name: "database-credentials" } },
    ];
    const state = workload(structuredClone(foreignEnvFrom));
    const originalEnv = structuredClone(state.spec.template.spec.containers[0].env);
    const originalMounts = structuredClone(state.spec.template.spec.containers[0].volumeMounts);
    const originalVolumes = structuredClone(state.spec.template.spec.volumes);
    const originalAnnotations = structuredClone(state.spec.template.metadata.annotations);
    const runner = new FakeRunner(state);
    const manager = new SSOManager(runner, keycloakEnvironment());

    await manager.keycloak();
    expect(state.spec.template.spec.containers[0].envFrom).toEqual([
      ...foreignEnvFrom,
      { configMapRef: { name: "openserverless-sso-config" } },
      { secretRef: { name: "openserverless-sso-secret" } },
    ]);
    expect(runner.local.SSO_ENABLED).toBe("true");
    expect(JSON.stringify(runner.local)).not.toContain("test-secret");

    await manager.disable();
    expect(state.spec.template.spec.containers[0].envFrom).toEqual(foreignEnvFrom);
    expect(runner.local.SSO_ENABLED).toBeUndefined();

    const patchesAfterFirstDisable = runner.commands.filter((entry) => entry.command.includes("patch")).length;
    await manager.disable();
    expect(runner.commands.filter((entry) => entry.command.includes("patch"))).toHaveLength(
      patchesAfterFirstDisable,
    );

    await manager.keycloak();
    expect(state.spec.template.spec.containers[0].envFrom).toEqual([
      ...foreignEnvFrom,
      { configMapRef: { name: "openserverless-sso-config" } },
      { secretRef: { name: "openserverless-sso-secret" } },
    ]);
    expect(state.spec.template.spec.containers[0].env).toEqual(originalEnv);
    expect(state.spec.template.spec.containers[0].volumeMounts).toEqual(originalMounts);
    expect(state.spec.template.spec.volumes).toEqual(originalVolumes);
    expect(state.spec.template.metadata.annotations).toEqual(originalAnnotations);
    expect(runner.commands.some((entry) => entry.command.includes("rollout"))).toBeFalse();
  });

  test("disable removes exact managed references and only waits for the resulting rollout", async () => {
    const state = workload([
      { configMapRef: { name: "application-config" } },
      { configMapRef: { name: "openserverless-sso-config" } },
      { secretRef: { name: "openserverless-sso-secret" } },
    ]);
    const runner = new FakeRunner(state);
    runner.local.SSO_KUBE_NAMESPACE = "nuvolaris";
    runner.local.SSO_KUBE_CONFIGMAP = "openserverless-sso-config";
    runner.local.SSO_KUBE_SECRET = "openserverless-sso-secret";
    runner.local.SSO_KUBE_STATEFULSET = "nuvolaris-system-api";
    runner.local.SSO_KUBE_CONTAINER = "nuvolaris-system-api";
    const manager = new SSOManager(runner, { OPS: "test-ops" });

    await manager.disable();

    expect(state.spec.template.spec.containers[0].envFrom).toEqual([
      { configMapRef: { name: "application-config" } },
    ]);
    const rolloutCommands = runner.commands
      .map((entry) => entry.command)
      .filter((command) => command.includes("rollout"));
    expect(rolloutCommands).toHaveLength(1);
    expect(rolloutCommands[0]).toContain("status");
    expect(rolloutCommands[0]).not.toContain("restart");
  });

  test("preserves similarly named references that were not created by the task", async () => {
    const prefixed = {
      prefix: "EXTERNAL_",
      configMapRef: { name: "openserverless-sso-config" },
    };
    const optional = {
      secretRef: { name: "openserverless-sso-secret", optional: false },
    };
    const state = workload([prefixed, optional]);
    const runner = new FakeRunner(state);
    const manager = new SSOManager(runner, {
      OPS: "test-ops",
      OPS_SSO_NO_ROLLOUT: "true",
    });

    await manager.disable();

    expect(state.spec.template.spec.containers[0].envFrom).toEqual([prefixed, optional]);
    expect(runner.commands.some((entry) => entry.command.includes("patch"))).toBeFalse();
  });
});
