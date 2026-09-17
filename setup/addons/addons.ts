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

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, join, resolve } from "node:path";
import { parseArgs } from "node:util";
import charts from "./charts.json";
import legacy from "./legacy.json";

type ObjectData = Record<string, any>;
type Environment = Record<string, string | undefined>;
type Artifact = { version: string; url: string; sha256: string };
export type Addon = {
  component: "ingress" | "cert-manager";
  profile: string;
  release: string;
  namespace: string;
  artifact: Artifact;
  values: string[];
};
export interface Runner {
  run(args: string[], input?: string): Promise<string>;
}

export class ProcessRunner implements Runner {
  async run(args: string[], input?: string): Promise<string> {
    const child = Bun.spawn(args, {
      stdin: input === undefined ? "ignore" : "pipe", stdout: "pipe", stderr: "pipe",
    });
    if (input !== undefined) {
      child.stdin.write(input);
      child.stdin.end();
    }
    const [stdout, stderr, code] = await Promise.all([
      new Response(child.stdout).text(), new Response(child.stderr).text(), child.exited,
    ]);
    if (code !== 0) throw new Error(`${args[0]} ${args[1]} failed (${code}): ${stderr.trim() || stdout.trim()}`);
    if (stderr) process.stderr.write(stderr);
    return stdout;
  }
}

export function selectAddon(component: string, provider?: string): Addon {
  if (component === "cert-manager" && !provider) {
    return { component, profile: "cert-manager", release: "cert-manager", namespace: "cert-manager",
      artifact: charts["cert-manager"], values: [join(import.meta.dir, "values/cert-manager.yaml")] };
  }
  const profile = provider === "aks" || provider === "gke" ? "cloud" : provider;
  if (component !== "ingress" || !profile || !["kind", "eks", "cloud"].includes(profile)) {
    throw new Error("Use ingress with kind, eks, aks or gke, or cert-manager without a provider. K3s keeps Traefik.");
  }
  const values = [join(import.meta.dir, "values/ingress.yaml")];
  values.push(join(import.meta.dir, `values/${profile}.yaml`));
  return { component, profile, release: "ingress-nginx", namespace: "ingress-nginx",
    artifact: charts.ingress[profile as keyof typeof charts.ingress], values };
}

export function objects(text: string): ObjectData[] {
  const parsed = Bun.YAML.parse(text);
  const docs = (Array.isArray(parsed) ? parsed : [parsed]).filter(Boolean);
  return docs.flatMap((doc: ObjectData) => doc.kind === "List" ? doc.items : [doc]);
}

// kubectl replace prints a JSON object per resource, without a List wrapper.
// Track string escaping so braces inside annotations cannot split documents.
export function jsonObjects(text: string): ObjectData[] {
  const docs: ObjectData[] = [];
  let start = -1, depth = 0, quoted = false, escaped = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (start < 0) {
      if (/\s/.test(c)) continue;
      if (c !== "{") throw new Error("Expected a Kubernetes JSON object.");
      start = i;
    }
    if (quoted) {
      if (escaped) escaped = false;
      else if (c === "\\") escaped = true;
      else if (c === '"') quoted = false;
    } else if (c === '"') quoted = true;
    else if (c === "{") depth++;
    else if (c === "}" && --depth === 0) {
      const doc = JSON.parse(text.slice(start, i + 1));
      docs.push(...(doc.kind === "List" ? doc.items : [doc]));
      start = -1;
    }
  }
  if (start >= 0) throw new Error("Incomplete Kubernetes JSON output.");
  return docs;
}

function list(items: ObjectData[]): string {
  return JSON.stringify({ apiVersion: "v1", kind: "List", items });
}

export function resourceKey(obj: ObjectData): string {
  return `${obj.kind}/${obj.metadata.namespace || ""}/${obj.metadata.name}`;
}

// Sorted keys make fingerprints independent of YAML/JSON serialization order.
export function canonical(value: any): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonical(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

export function digest(value: string | Uint8Array): string {
  return createHash("sha256").update(value).digest("hex");
}

export function images(items: ObjectData[]): string[] {
  const result = new Set<string>();
  const visit = (value: any): void => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    for (const [key, entry] of Object.entries(value)) {
      if (key === "image" && typeof entry === "string") result.add(entry);
      // cert-manager creates solver pods dynamically, outside the rendered chart.
      if (key === "args" && Array.isArray(entry)) {
        for (const arg of entry) {
          if (typeof arg === "string" && arg.startsWith("--acme-http01-solver-image=")) result.add(arg.split("=")[1]);
        }
      }
      visit(entry);
    }
  };
  items.forEach(visit);
  return [...result].sort();
}

export async function cacheChart(addon: Addon, env: Environment = process.env): Promise<string> {
  const dir = resolve(env.OPS_ADDON_CACHE || join(env.OPS_HOME || join(homedir(), ".ops"), "cache/helm-addons"));
  const file = join(dir, basename(new URL(addon.artifact.url).pathname));
  const verify = (data: Uint8Array) => {
    if (digest(data) !== addon.artifact.sha256) throw new Error(`Chart checksum mismatch: ${file}. Remove the invalid cached file and retry.`);
  };
  if (existsSync(file)) { verify(readFileSync(file)); return file; }
  const response = await fetch(addon.artifact.url, {
    headers: { "User-Agent": "Helm/3.18.0" }, signal: AbortSignal.timeout(60000),
  });
  if (!response.ok) throw new Error(`Cannot download ${addon.artifact.url}: HTTP ${response.status}`);
  const data = new Uint8Array(await response.arrayBuffer());
  verify(data);
  mkdirSync(dir, { recursive: true });
  const temporary = mkdtempSync(join(dir, ".download-"));
  try {
    const staged = join(temporary, basename(file));
    writeFileSync(staged, data);
    renameSync(staged, file);
  } finally { rmSync(temporary, { recursive: true, force: true }); }
  return file;
}

export async function render(addon: Addon, chart: string, runner: Runner, withCRDs = false): Promise<ObjectData[]> {
  const args = ["helm", "template", addon.release, chart, "--namespace", addon.namespace,
    ...addon.values.flatMap(file => ["--values", file])];
  if (withCRDs && addon.component === "cert-manager") args.push("--set", "installCRDs=true");
  return objects(await runner.run(args));
}

export function kubeconfig(env: Environment, explicit?: string): string {
  if (explicit) return resolve(explicit);
  if (env.KUBECONFIG) return env.KUBECONFIG;
  const temporary = env.OPS_TMP && join(env.OPS_TMP, "kubeconfig");
  return temporary && existsSync(temporary) ? temporary : join(homedir(), ".kube/config");
}

const OWNER = "openserverless-task/helm-addons-v1";
const MARKER = "openserverlessAddon";
const LAST_APPLIED = "kubectl.kubernetes.io/last-applied-configuration";
const OWNER_LABEL = "openserverless.org/addon-owner";

export function legacyDigest(obj: ObjectData): string {
  const copy = structuredClone(obj);
  delete copy.metadata.annotations?.[LAST_APPLIED];
  if (copy.metadata.creationTimestamp === null) delete copy.metadata.creationTimestamp;
  for (const key of ["annotations", "labels"]) {
    if (copy.metadata[key] && !Object.keys(copy.metadata[key]).length) delete copy.metadata[key];
  }
  if (!copy.metadata.namespace) delete copy.metadata.namespace;
  return digest(canonical(copy));
}

export function checkOwnership(obj: ObjectData, addon: Addon, managed: boolean): void {
  const m = obj.metadata;
  const a = m.annotations || {};
  const labels = m.labels || {};
  if (labels[OWNER_LABEL] && labels[OWNER_LABEL] !== "ops") {
    throw new Error(`${resourceKey(obj)} belongs to a different add-on manager.`);
  }
  if (m.ownerReferences?.length || a["argocd.argoproj.io/tracking-id"] ||
      labels["argocd.argoproj.io/instance"] || labels["helm.toolkit.fluxcd.io/name"] ||
      labels["kustomize.toolkit.fluxcd.io/name"]) {
    throw new Error(`${resourceKey(obj)} is managed by another controller.`);
  }
  const helmOwned = a["meta.helm.sh/release-name"] === addon.release &&
    a["meta.helm.sh/release-namespace"] === addon.namespace;
  const ownHook = managed && a["helm.sh/hook"] && labels[OWNER_LABEL] === "ops" &&
    !a["meta.helm.sh/release-name"] && !a["meta.helm.sh/release-namespace"];
  if (a["meta.helm.sh/release-name"] || a["meta.helm.sh/release-namespace"] || labels["app.kubernetes.io/managed-by"]) {
    if (!managed || (!helmOwned && !ownHook) || labels["app.kubernetes.io/managed-by"] !== "Helm") {
      throw new Error(`${resourceKey(obj)} belongs to an external installation; it will not be adopted or overwritten.`);
    }
  } else if (managed && obj.kind !== "CustomResourceDefinition") {
    throw new Error(`${resourceKey(obj)} has lost its Helm ownership metadata.`);
  }
}

export function legacyManifest(obj: ObjectData, addon: Addon): ObjectData {
  const applied = obj.metadata.annotations?.[LAST_APPLIED];
  const expected = (legacy as Record<string, Record<string, string>>)[addon.profile]?.[resourceKey(obj)];
  if (!applied || !expected) throw new Error(`${resourceKey(obj)} is not a recognized legacy manifest; review it manually.`);
  let original: ObjectData;
  try { original = JSON.parse(applied); } catch { throw new Error(`Invalid last-applied configuration on ${resourceKey(obj)}.`); }
  if (legacyDigest(original) !== expected) {
    throw new Error(`${resourceKey(obj)} differs from the 0.9.0 manifest; automatic adoption is refused.`);
  }
  return original;
}

// Keep values allocated by Kubernetes when checking a legacy resource with a
// server-side dry run. Everything else must still match the original manifest.
export function replacement(original: ObjectData, live: ObjectData): ObjectData {
  const result = structuredClone(original);
  result.metadata.resourceVersion = live.metadata.resourceVersion;
  if (live.kind === "Service") {
    for (const key of ["clusterIP", "clusterIPs", "healthCheckNodePort"]) {
      if (result.spec[key] === undefined && live.spec[key] !== undefined) result.spec[key] = live.spec[key];
    }
    for (const port of result.spec.ports || []) {
      const actual = live.spec.ports.find((item: ObjectData) => item.name === port.name);
      if (port.nodePort === undefined && actual?.nodePort) port.nodePort = actual.nodePort;
    }
  }
  if (live.kind === "ServiceAccount" && live.secrets) result.secrets = live.secrets;
  if (live.kind.endsWith("WebhookConfiguration")) {
    for (const hook of result.webhooks) {
      const actual = live.webhooks.find((item: ObjectData) => item.name === hook.name);
      if (actual?.clientConfig?.caBundle) hook.clientConfig.caBundle = actual.clientConfig.caBundle;
    }
  }
  if (live.kind === "Job") {
    result.spec.selector = live.spec.selector;
    const labels = live.spec.template.metadata.labels || {};
    result.spec.template.metadata.labels ||= {};
    for (const key of ["controller-uid", "job-name", "batch.kubernetes.io/controller-uid", "batch.kubernetes.io/job-name"]) {
      if (labels[key]) result.spec.template.metadata.labels[key] = labels[key];
    }
  }
  return result;
}

function body(obj: ObjectData): string {
  const copy = structuredClone(obj);
  delete copy.metadata;
  delete copy.status;
  return canonical(copy);
}

export class AddonManager {
  constructor(private runner: Runner, private config: string, private timeout = "10m") {
    if (!/^(?:\d+(?:ms|s|m|h))+$/.test(timeout)) throw new Error("Timeout must be a duration, for example 10m or 90s.");
  }
  private kube(args: string[], input?: string): Promise<string> {
    return this.runner.run(["kubectl", "--kubeconfig", this.config, ...args], input);
  }
  private helm(addon: Addon, args: string[]): Promise<string> {
    return this.runner.run(["helm", ...args, "--kubeconfig", this.config, "--namespace", addon.namespace]);
  }
  private async ownedRelease(addon: Addon): Promise<boolean> {
    const releases = JSON.parse(await this.helm(addon, ["list", "--all", "--filter", `^${addon.release}$`, "--output", "json"]));
    if (!releases.length) return false;
    const values = JSON.parse(await this.helm(addon, ["get", "values", addon.release, "--output", "json"]));
    if (values?.[MARKER]?.owner !== OWNER || values[MARKER].profile !== addon.profile) {
      throw new Error(`Helm release ${addon.release} is not managed by this task for profile ${addon.profile}; leaving it unchanged.`);
    }
    if (releases[0].chart !== `${addon.release}-${addon.artifact.version}`) {
      throw new Error(`Helm release ${addon.release} uses a different chart version; automatic replacement is refused.`);
    }
    if (addon.component === "cert-manager" && values.installCRDs) {
      throw new Error("This release manages cert-manager CRDs. Separate their lifecycle before using these tasks.");
    }
    return true;
  }
  async uninstall(addon: Addon): Promise<void> {
    if (!await this.ownedRelease(addon)) {
      console.log(`No managed Helm release ${addon.release}; existing manifest installations are left unchanged.`);
      return;
    }
    const manifest = objects(await this.helm(addon, ["get", "manifest", addon.release]));
    if (manifest.some(obj => ["CustomResourceDefinition", "Namespace"].includes(obj.kind))) {
      throw new Error("The release contains CRDs or namespaces; refusing to delete shared resources.");
    }
    if (manifest.length) {
      const current = jsonObjects(await this.kube(["get", "--ignore-not-found", "-o", "json", "-f", "-"], list(manifest)));
      // A failed adoption may have created a release record before it adopted
      // the old resources. A record alone does not authorize their removal.
      for (const obj of current) checkOwnership(obj, addon, true);
    }
    await this.helm(addon, ["uninstall", addon.release, "--wait", "--timeout", this.timeout]);
    console.log(`Removed ${addon.release}. Namespaces, cert-manager CRDs and certificate resources were retained.`);
  }
  async install(addon: Addon, chart: string, adopt = false): Promise<void> {
    const managed = await this.ownedRelease(addon);
    const rendered = await render(addon, chart, this.runner, true);
    const current = jsonObjects(await this.kube(["get", "--ignore-not-found", "-o", "json", "-f", "-"], list(rendered)));
    const byKey = new Map(current.map(obj => [resourceKey(obj), obj]));
    const candidates = current.filter(obj => {
      const a = obj.metadata.annotations || {};
      const labels = obj.metadata.labels || {};
      if (obj.kind === "CustomResourceDefinition" && (managed || labels[OWNER_LABEL] === "ops")) return false;
      const releaseOwned = a["meta.helm.sh/release-name"] === addon.release &&
        a["meta.helm.sh/release-namespace"] === addon.namespace;
      const hookOwned = a["helm.sh/hook"] && labels[OWNER_LABEL] === "ops";
      return !(managed && (releaseOwned || hookOwned));
    });
    for (const obj of current) checkOwnership(obj, addon, managed && !candidates.includes(obj));
    if (candidates.length && !adopt) {
      throw new Error(`Existing ${addon.release} resources found. Review 'ops setup addons render ${addon.component}${addon.component === "ingress" ? ` ${addon.profile}` : ""}' and use --adopt only for your unmodified OpenServerless 0.9.0 installation.`);
    }
    if (candidates.length) {
      const originals = candidates.map(obj => replacement(legacyManifest(obj, addon), obj));
      // A read-only server dry run supplies Kubernetes defaults, so live edits
      // cannot be hidden by comparing only a subset of the resource fields.
      const checked = jsonObjects(await this.kube(["replace", "--dry-run=server", "-o", "json", "-f", "-"], list(originals)));
      if (checked.length !== candidates.length) throw new Error("Incomplete legacy validation; no resources were changed.");
      for (const obj of checked) {
        const live = byKey.get(resourceKey(obj));
        if (!live || body(obj) !== body(live)) {
          throw new Error(`${resourceKey(obj)} has live configuration changes; automatic adoption is refused.`);
        }
      }
    }

    const crds = rendered.filter(obj => obj.kind === "CustomResourceDefinition");
    const missing = crds.filter(obj => !byKey.has(resourceKey(obj)));
    if (missing.length) {
      // CRDs are deliberately excluded from the Helm release, including during
      // adoption. Never replace an existing schema or use --force-conflicts.
      const standalone = missing.map(obj => {
        const copy = structuredClone(obj);
        delete copy.metadata.labels?.["app.kubernetes.io/managed-by"];
        delete copy.metadata.labels?.["helm.sh/chart"];
        return copy;
      });
      await this.kube(["create", "-f", "-"], list(standalone));
    }
    if (crds.length) {
      await this.kube(["wait", "--for=condition=Established", `--timeout=${this.timeout}`,
        ...crds.map(obj => `crd/${obj.metadata.name}`)]);
    }

    const args = ["upgrade", "--install", addon.release, chart, "--create-namespace",
      "--wait", "--wait-for-jobs", "--timeout", this.timeout,
      ...addon.values.flatMap(file => ["--values", file]),
      "--set-string", `${MARKER}.owner=${OWNER}`, "--set-string", `${MARKER}.profile=${addon.profile}`];
    if (managed) args.push("--reuse-values");
    if (candidates.some(obj => obj.kind !== "CustomResourceDefinition")) args.push("--take-ownership");

    // Pin allocated ports/IPs during adoption; reuse-values retains them on
    // subsequent runs. The Service itself is never deleted or force-replaced.
    const service = current.find(obj => obj.kind === "Service" && obj.metadata.name === "ingress-nginx-controller");
    const temporary = mkdtempSync(join(tmpdir(), "ops-addons-"));
    try {
      if (!managed && service) {
        const values: ObjectData = { annotations: { ...service.metadata.annotations }, nodePorts: {} };
        delete values.annotations[LAST_APPLIED];
        for (const key of ["clusterIP", "healthCheckNodePort"]) {
          if (service.spec[key]) values[key] = service.spec[key];
        }
        for (const port of service.spec.ports || []) if (port.nodePort) values.nodePorts[port.name] = port.nodePort;
        const file = join(temporary, "service.json");
        writeFileSync(file, JSON.stringify({ controller: { service: values } }));
        args.push("--values", file);
      }
      // No --atomic/--force: a failed first adoption must not uninstall the
      // pre-existing controller. A failed owned release can be retried.
      const output = await this.helm(addon, args);
      // Helm's readiness threshold allows maxUnavailable replicas to be absent.
      // Require completed rollouts without changing the legacy update strategy.
      for (const deployment of rendered.filter(obj => obj.kind === "Deployment")) {
        await this.kube(["rollout", "status", `deployment/${deployment.metadata.name}`,
          "--namespace", deployment.metadata.namespace || addon.namespace, `--timeout=${this.timeout}`]);
      }
      // Remember validated legacy CRDs outside Helm, just like newly created
      // CRDs, so uninstall/reinstall does not require adopting them again.
      for (const crd of current.filter(obj => obj.kind === "CustomResourceDefinition" &&
        obj.metadata.labels?.[OWNER_LABEL] !== "ops")) {
        await this.kube(["patch", "crd", crd.metadata.name, "--type=merge", "-p",
          JSON.stringify({ metadata: { resourceVersion: crd.metadata.resourceVersion,
            labels: { [OWNER_LABEL]: "ops" } } })]);
      }
      if (output) process.stdout.write(output);
    } finally { rmSync(temporary, { recursive: true, force: true }); }
  }
}

const HELP = `Manage the pinned OpenServerless 0.9.0 Helm add-ons.
Usage:
  bun addons.ts ingress <kind|eks|aks|gke> [--adopt|--uninstall] [--kubeconfig=<file>] [--timeout=<duration>]
  bun addons.ts cert-manager [--adopt|--uninstall] [--kubeconfig=<file>] [--timeout=<duration>]
  bun addons.ts <render|images|download> ingress <kind|eks|aks|gke>
  bun addons.ts <render|images|download> cert-manager
Render/images/download never connect to Kubernetes. Cache: OPS_ADDON_CACHE.
Adoption requires unmodified legacy kubectl-apply manifests and explicit --adopt.
`;

export async function main(argv: string[], env: Environment = process.env, runner: Runner = new ProcessRunner()): Promise<void> {
  const parsed = parseArgs({ args: argv, allowPositionals: true, options: {
    help: { type: "boolean" }, adopt: { type: "boolean" }, uninstall: { type: "boolean" },
    kubeconfig: { type: "string" }, timeout: { type: "string" },
  } });
  if (parsed.values.help) { console.log(HELP); return; }
  const words = [...parsed.positionals];
  const mode = ["render", "images", "download"].includes(words[0]) ? words.shift()! : "install";
  const addon = selectAddon(words[0], words[1]);
  if (words.length > 2) throw new Error("Unexpected arguments. Use --help.");
  const truth = (value?: string) => value === "true" || value === "1";
  const adopt = parsed.values.adopt || truth(env.OPS_ADDON_ADOPT);
  const uninstall = parsed.values.uninstall || truth(env.OPS_ADDON_UNINSTALL) || Boolean(env.OPS_ADDON_DELETE);
  if (adopt && uninstall) throw new Error("--adopt and --uninstall cannot be combined.");
  if (mode !== "install" && (adopt || uninstall)) throw new Error("Render, images and download cannot be combined with adoption or uninstall.");
  const timeout = parsed.values.timeout || env.OPS_ADDON_TIMEOUT || "10m";
  const manager = new AddonManager(runner, kubeconfig(env, parsed.values.kubeconfig || env.OPS_ADDON_KUBECONFIG), timeout);
  if (uninstall) { await manager.uninstall(addon); return; }
  const chart = await cacheChart(addon, env);
  if (mode === "download") { console.log(chart); return; }
  if (mode === "render" || mode === "images") {
    const rendered = await render(addon, chart, runner, true);
    if (mode === "images") console.log(images(rendered).join("\n"));
    else console.log(rendered.map(obj => JSON.stringify(obj, null, 2)).join("\n---\n"));
    return;
  }
  await manager.install(addon, chart, adopt);
}

if (import.meta.main) {
  main(Bun.argv.slice(2)).catch(error => { console.error(`ERROR: ${error.message}`); process.exitCode = 1; });
}
