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

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

export interface RunOptions {
  stdin?: string;
  quiet?: boolean;
}

export interface CommandRunner {
  run(command: string[], options?: RunOptions): Promise<CommandResult>;
}

interface LocalObjectReference {
  name: string;
  optional?: boolean;
}

interface EnvFromSource {
  prefix?: string;
  configMapRef?: LocalObjectReference;
  secretRef?: LocalObjectReference;
}

interface SSOOptions {
  issuerURL: string;
  jwksURL: string;
  audience: string;
  clientID: string;
  clientSecret: string;
  requiredGroup: string;
  usernameClaim: string;
  groupsClaim: string;
  namespace: string;
  configMapName: string;
  secretName: string;
  workloadName: string;
  containerName: string;
  noRollout: boolean;
}

interface JSONPatchOperation {
  op: "add" | "remove" | "test";
  path: string;
  value?: unknown;
}

const DEFAULTS = {
  usernameClaim: "preferred_username",
  groupsClaim: "groups",
  namespace: "nuvolaris",
  configMapName: "openserverless-sso-config",
  secretName: "openserverless-sso-secret",
  workloadName: "nuvolaris-system-api",
  containerName: "nuvolaris-system-api",
};

const MANAGED_LOCAL_KEYS = [
  "SSO_ENABLED",
  "SSO_PROVIDER",
  "SSO_OIDC_ISSUER_URL",
  "SSO_OIDC_JWKS_URL",
  "SSO_OIDC_AUDIENCE",
  "SSO_OIDC_CLIENT_ID",
  "SSO_OIDC_REQUIRED_GROUP",
  "SSO_OIDC_USERNAME_CLAIM",
  "SSO_OIDC_GROUPS_CLAIM",
  "SSO_OIDC_CLIENT_SECRET_CONFIGURED",
  "SSO_CLIENT_MODE",
  "SSO_AUTOPROVISION_ON_LOGIN",
  "SSO_AUTOPROVISION_TIMEOUT_SECONDS",
  "SSO_AUTOPROVISION_POLL_SECONDS",
  "SSO_AUTOPROVISION_DEFAULT_SERVICES",
  "SSO_NAMESPACE_PRESERVE_VALID",
  "SSO_NAMESPACE_HASH_LENGTH",
  "SSO_NAMESPACE_MAX_LENGTH",
  "SSO_KUBE_NAMESPACE",
  "SSO_KUBE_CONFIGMAP",
  "SSO_KUBE_SECRET",
  "SSO_KUBE_STATEFULSET",
  "SSO_KUBE_CONTAINER",
] as const;

export class ProcessCommandRunner implements CommandRunner {
  async run(command: string[], options: RunOptions = {}): Promise<CommandResult> {
    const process = Bun.spawn(command, {
      stdin: options.stdin === undefined ? "ignore" : "pipe",
      stdout: "pipe",
      stderr: "pipe",
      env: Bun.env,
    });
    if (options.stdin !== undefined) {
      process.stdin.write(options.stdin);
      process.stdin.end();
    }

    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(process.stdout).text(),
      new Response(process.stderr).text(),
      process.exited,
    ]);
    if (!options.quiet) {
      if (stdout) processOutput(stdout, false);
      if (stderr) processOutput(stderr, true);
    }
    if (exitCode !== 0) {
      const detail = stderr.trim() || stdout.trim();
      throw new Error(
        `${command.join(" ")} failed with exit code ${exitCode}${detail ? `: ${detail}` : ""}`,
      );
    }
    return { stdout, stderr, exitCode };
  }
}

function processOutput(output: string, error: boolean): void {
  (error ? process.stderr : process.stdout).write(output);
}

export class SSOManager {
  constructor(
    private readonly runner: CommandRunner,
    private readonly env: Record<string, string | undefined> = Bun.env,
  ) {}

  async keycloak(): Promise<void> {
    if (this.env.OPS_SSO_ENABLE !== "true") {
      throw new Error("missing --enable");
    }
    const local = await this.readLocalConfig();
    const options = this.options(local, true);
    this.validateKeycloak(options);

    await this.applyConfigMap(options);
    if (options.clientSecret) {
      await this.applySecret(options);
    } else {
      await this.deleteSecret(options);
    }
    await this.reconcileEnvFrom(options, true);
    await this.saveLocalConfig(options);

    if (!options.noRollout) {
      await this.rolloutRestart(options);
    }

    console.log("SSO configuration applied to admin-api.");
    console.log(`ConfigMap: ${options.namespace}/${options.configMapName}`);
    if (options.clientSecret) {
      console.log(`Secret: ${options.namespace}/${options.secretName}`);
    }
  }

  async show(): Promise<void> {
    const values = await this.readLocalConfig();
    for (const key of Object.keys(values).filter((key) => key.startsWith("SSO_")).sort()) {
      console.log(`${key}=${values[key]}`);
    }
  }

  async disable(): Promise<void> {
    const local = await this.readLocalConfig();
    const options = this.options(local, false);

    const workloadChanged = await this.reconcileEnvFrom(options, false);
    await this.deleteConfigMap(options);
    await this.deleteSecret(options);
    await this.removeLocalConfig(local);

    if (!options.noRollout && workloadChanged) {
      await this.waitForRollout(options);
    }
    console.log("SSO configuration disabled for admin-api.");
  }

  private options(local: Record<string, string>, enabling: boolean): SSOOptions {
    const option = (environment: string, localKey: string, fallback: string): string =>
      this.env[environment] || local[localKey] || fallback;
    const clientID = this.env.OPS_SSO_CLIENT_ID || "";
    const audience = this.env.OPS_SSO_AUDIENCE || clientID;

    return {
      issuerURL: this.env.OPS_SSO_ISSUER_URL || "",
      jwksURL: this.env.OPS_SSO_JWKS_URL || "",
      audience,
      clientID: clientID || audience,
      clientSecret: this.env.OPS_SSO_CLIENT_SECRET || "",
      requiredGroup: this.env.OPS_SSO_REQUIRED_GROUP || "",
      usernameClaim: this.env.OPS_SSO_USERNAME_CLAIM || DEFAULTS.usernameClaim,
      groupsClaim: this.env.OPS_SSO_GROUPS_CLAIM || DEFAULTS.groupsClaim,
      namespace: option("OPS_SSO_NAMESPACE", "SSO_KUBE_NAMESPACE", DEFAULTS.namespace),
      configMapName: option("OPS_SSO_CONFIGMAP", "SSO_KUBE_CONFIGMAP", DEFAULTS.configMapName),
      secretName: option("OPS_SSO_SECRET", "SSO_KUBE_SECRET", DEFAULTS.secretName),
      workloadName: option("OPS_SSO_STATEFULSET", "SSO_KUBE_STATEFULSET", DEFAULTS.workloadName),
      containerName: option("OPS_SSO_CONTAINER", "SSO_KUBE_CONTAINER", DEFAULTS.containerName),
      noRollout: this.env.OPS_SSO_NO_ROLLOUT === "true",
    } satisfies SSOOptions;
  }

  private validateKeycloak(options: SSOOptions): void {
    const required: Array<[string, string]> = [
      ["--issuer-url", options.issuerURL],
      ["--jwks-url", options.jwksURL],
      ["--audience or --client-id", options.audience],
      ["--required-group", options.requiredGroup],
      ["--username-claim", options.usernameClaim],
      ["--groups-claim", options.groupsClaim],
      ["--secret", options.secretName],
    ];
    for (const [name, value] of required) {
      if (!value) throw new Error(`missing ${name}`);
    }
  }

  private async readLocalConfig(): Promise<Record<string, string>> {
    const result = await this.runner.run([this.ops(), "-config", "-dump"], { quiet: true });
    const values: Record<string, string> = {};
    for (const line of result.stdout.split("\n")) {
      const separator = line.indexOf("=");
      if (separator <= 0) continue;
      values[line.slice(0, separator)] = line.slice(separator + 1);
    }
    return values;
  }

  private async saveLocalConfig(options: SSOOptions): Promise<void> {
    const values: Record<string, string> = {
      SSO_ENABLED: "true",
      SSO_PROVIDER: "keycloak",
      SSO_OIDC_ISSUER_URL: options.issuerURL,
      SSO_OIDC_JWKS_URL: options.jwksURL,
      SSO_OIDC_AUDIENCE: options.audience,
      SSO_OIDC_CLIENT_ID: options.clientID,
      SSO_OIDC_REQUIRED_GROUP: options.requiredGroup,
      SSO_OIDC_USERNAME_CLAIM: options.usernameClaim,
      SSO_OIDC_GROUPS_CLAIM: options.groupsClaim,
      SSO_OIDC_CLIENT_SECRET_CONFIGURED: String(Boolean(options.clientSecret)),
      SSO_CLIENT_MODE: options.clientSecret ? "confidential" : "public",
      SSO_AUTOPROVISION_ON_LOGIN: "true",
      SSO_AUTOPROVISION_TIMEOUT_SECONDS: "120",
      SSO_AUTOPROVISION_POLL_SECONDS: "2",
      SSO_AUTOPROVISION_DEFAULT_SERVICES: "all",
      SSO_NAMESPACE_PRESERVE_VALID: "true",
      SSO_NAMESPACE_HASH_LENGTH: "8",
      SSO_NAMESPACE_MAX_LENGTH: "61",
      SSO_KUBE_NAMESPACE: options.namespace,
      SSO_KUBE_CONFIGMAP: options.configMapName,
      SSO_KUBE_SECRET: options.secretName,
      SSO_KUBE_STATEFULSET: options.workloadName,
      SSO_KUBE_CONTAINER: options.containerName,
    };
    await this.runner.run([
      this.ops(),
      "-config",
      ...Object.entries(values).map(([key, value]) => `${key}=${value}`),
    ]);
  }

  private async removeLocalConfig(local: Record<string, string>): Promise<void> {
    const keys = MANAGED_LOCAL_KEYS.filter((key) => Object.hasOwn(local, key));
    if (keys.length === 0) return;
    await this.runner.run([this.ops(), "-config", "--remove", ...keys]);
  }

  private async applyConfigMap(options: SSOOptions): Promise<void> {
    const object = {
      apiVersion: "v1",
      kind: "ConfigMap",
      metadata: { name: options.configMapName, namespace: options.namespace },
      data: {
        OIDC_ISSUER_URL: options.issuerURL,
        OIDC_JWKS_URL: options.jwksURL,
        OIDC_AUDIENCE: options.audience,
        OIDC_CLIENT_ID: options.clientID,
        OIDC_REQUIRED_GROUP: options.requiredGroup,
        OIDC_USERNAME_CLAIM: options.usernameClaim,
        OIDC_GROUPS_CLAIM: options.groupsClaim,
        SSO_AUTOPROVISION_ON_LOGIN: "true",
        SSO_AUTOPROVISION_TIMEOUT_SECONDS: "120",
        SSO_AUTOPROVISION_POLL_SECONDS: "2",
        SSO_AUTOPROVISION_DEFAULT_SERVICES: "all",
        SSO_NAMESPACE_PRESERVE_VALID: "true",
        SSO_NAMESPACE_HASH_LENGTH: "8",
        SSO_NAMESPACE_MAX_LENGTH: "61",
      },
    };
    await this.runner.run(["kubectl", "apply", "-f", "-"], { stdin: JSON.stringify(object) });
  }

  private async applySecret(options: SSOOptions): Promise<void> {
    const object = {
      apiVersion: "v1",
      kind: "Secret",
      metadata: { name: options.secretName, namespace: options.namespace },
      type: "Opaque",
      stringData: { OIDC_CLIENT_SECRET: options.clientSecret },
    };
    await this.runner.run(["kubectl", "apply", "-f", "-"], { stdin: JSON.stringify(object) });
  }

  private async deleteConfigMap(options: SSOOptions): Promise<void> {
    await this.runner.run([
      "kubectl", "-n", options.namespace, "delete", "configmap", options.configMapName, "--ignore-not-found",
    ]);
  }

  private async deleteSecret(options: SSOOptions): Promise<void> {
    await this.runner.run([
      "kubectl", "-n", options.namespace, "delete", "secret", options.secretName, "--ignore-not-found",
    ]);
  }

  private async reconcileEnvFrom(options: SSOOptions, enabled: boolean): Promise<boolean> {
    const result = await this.runner.run([
      "kubectl", "-n", options.namespace, "get", "statefulset", options.workloadName, "-o", "json",
    ], { quiet: true });
    const workload = JSON.parse(result.stdout);
    const containers = workload?.spec?.template?.spec?.containers;
    if (!Array.isArray(containers)) {
      throw new Error(`statefulset ${options.namespace}/${options.workloadName} has no containers`);
    }
    const containerIndex = containers.findIndex((container: { name?: string }) =>
      container.name === options.containerName
    );
    if (containerIndex < 0) {
      throw new Error(
        `container ${options.containerName} not found in statefulset ${options.namespace}/${options.workloadName}`,
      );
    }

    const container = containers[containerIndex];
    const current: EnvFromSource[] = Array.isArray(container.envFrom) ? container.envFrom : [];
    const desired: EnvFromSource[] = enabled
      ? [
          { configMapRef: { name: options.configMapName } },
          ...(options.clientSecret ? [{ secretRef: { name: options.secretName } }] : []),
        ]
      : [];

    const seen = new Set<string>();
    const removeIndexes: number[] = [];
    current.forEach((source, index) => {
      const key = managedReferenceKey(source, options);
      if (!key) return;
      if (enabled && desired.some((item) => referenceKey(item) === key) && !seen.has(key)) {
        seen.add(key);
      } else {
        removeIndexes.push(index);
      }
    });
    const missing = desired.filter((source) => !seen.has(referenceKey(source)));
    if (removeIndexes.length === 0 && missing.length === 0) return false;

    const path = `/spec/template/spec/containers/${containerIndex}/envFrom`;
    const patch: JSONPatchOperation[] = [];
    for (const index of removeIndexes.toReversed()) {
      patch.push({ op: "test", path: `${path}/${index}`, value: current[index] });
      patch.push({ op: "remove", path: `${path}/${index}` });
    }
    if (current.length === 0) {
      patch.push({ op: "add", path, value: missing });
    } else {
      for (const source of missing) {
        patch.push({ op: "add", path: `${path}/-`, value: source });
      }
    }

    await this.runner.run([
      "kubectl", "-n", options.namespace, "patch", "statefulset", options.workloadName,
      "--type=json", "-p", JSON.stringify(patch),
    ]);
    return true;
  }

  private async rolloutRestart(options: SSOOptions): Promise<void> {
    await this.runner.run([
      "kubectl", "-n", options.namespace, "rollout", "restart", `statefulset/${options.workloadName}`,
    ]);
    await this.waitForRollout(options);
  }

  private async waitForRollout(options: SSOOptions): Promise<void> {
    await this.runner.run([
      "kubectl", "-n", options.namespace, "rollout", "status", `statefulset/${options.workloadName}`,
      "--timeout=180s",
    ]);
  }

  private ops(): string {
    return this.env.OPS || "ops";
  }
}

function managedReferenceKey(source: EnvFromSource, options: SSOOptions): string {
  if (source.prefix) return "";
  if (
    source.configMapRef?.name === options.configMapName &&
    source.configMapRef.optional === undefined &&
    source.secretRef === undefined
  ) {
    return `configmap:${options.configMapName}`;
  }
  if (
    source.secretRef?.name === options.secretName &&
    source.secretRef.optional === undefined &&
    source.configMapRef === undefined
  ) {
    return `secret:${options.secretName}`;
  }
  return "";
}

function referenceKey(source: EnvFromSource): string {
  if (source.configMapRef) return `configmap:${source.configMapRef.name}`;
  if (source.secretRef) return `secret:${source.secretRef.name}`;
  return "";
}

async function main(): Promise<void> {
  const command = process.argv[2];
  const manager = new SSOManager(new ProcessCommandRunner());
  switch (command) {
    case "keycloak":
      await manager.keycloak();
      return;
    case "show":
      await manager.show();
      return;
    case "disable":
      await manager.disable();
      return;
    default:
      throw new Error(`unknown SSO command: ${command || "<empty>"}`);
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`error: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
