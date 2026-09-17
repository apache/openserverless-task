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
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import {
  AddonManager, cacheChart, checkOwnership, images, legacyManifest, main,
  render, selectAddon, jsonObjects, type Runner,
} from "./addons";
import service from "./fixtures/legacy-kind-service.json";

const ingress = selectAddon("ingress", "kind");
const cert = selectAddon("cert-manager");
const kubeconfig = "/tmp/selected cluster/config";
const asList = (items: any[]) => JSON.stringify({ apiVersion: "v1", kind: "List", items });
const crd = {
  apiVersion: "apiextensions.k8s.io/v1", kind: "CustomResourceDefinition",
  metadata: { name: "certificates.cert-manager.io" }, spec: { group: "cert-manager.io" },
};
const legacyService = (): Record<string, any> => ({
  ...structuredClone(service),
  metadata: { ...structuredClone(service.metadata), resourceVersion: "123",
    annotations: { "kubectl.kubernetes.io/last-applied-configuration": JSON.stringify(service) } },
});

class Cluster implements Runner {
  calls: { args: string[]; input?: string }[] = [];
  release = false;
  values: any = null;
  current: any[] = [];
  desired: any[] = [structuredClone(service)];
  checked?: any[];
  failUpgrade = false;
  failRollout = false;
  chartOverride?: string;
  constructor(readonly addon = ingress) {}
  ownRelease() {
    this.release = true;
    this.values = { openserverlessAddon: { owner: "openserverless-task/helm-addons-v1", profile: this.addon.profile }, installCRDs: false };
    return this;
  }
  async run(args: string[], input?: string) {
    this.calls.push({ args, input });
    if (args[0] === "helm") {
      if (args[1] === "list") return JSON.stringify(this.release ? [{ name: this.addon.release, chart: this.chartOverride || `${this.addon.release}-${this.addon.artifact.version}` }] : []);
      if (args[1] === "get" && args[2] === "manifest") return asList(this.desired);
      if (args[1] === "get") return JSON.stringify(this.values);
      if (args[1] === "template") return asList(this.desired);
      if (args[1] === "upgrade" && this.failUpgrade) throw new Error("simulated readiness failure");
      if (["upgrade", "uninstall"].includes(args[1])) return "";
    }
    if (args[0] === "kubectl") {
      if (args[3] === "rollout") {
        if (this.failRollout) throw new Error("simulated rollout timeout");
        return "";
      }
      if (args[3] === "get") return asList(this.current);
      if (args[3] === "replace" && args.includes("--dry-run=server")) return (this.checked || this.current).map(obj => JSON.stringify(obj, null, 2)).join("\n");
      if (["create", "wait", "patch"].includes(args[3])) return "";
    }
    throw new Error(`Unexpected command: ${args.join(" ")}`);
  }
  mutations() {
    return this.calls.filter(({ args }) => (args[0] === "helm" && ["upgrade", "uninstall"].includes(args[1])) ||
      (args[0] === "kubectl" && ["create", "apply", "delete", "patch"].includes(args[3])));
  }
  manager() { return new AddonManager(this, kubeconfig, "90s"); }
}

describe("chart selection and local operations", () => {
  test("waits for a completed rollout after Helm and propagates timeout without cleanup", async () => {
    const cluster = new Cluster();
    cluster.desired = [{ apiVersion: "apps/v1", kind: "Deployment", metadata: { name: "ingress-nginx-controller", namespace: "ingress-nginx" } }];
    await cluster.manager().install(ingress, "/chart");
    const rollout = cluster.calls.findIndex(call => call.args.includes("rollout"));
    expect(rollout).toBeGreaterThan(cluster.calls.findIndex(call => call.args.includes("upgrade")));
    expect(cluster.calls[rollout].args).toEqual(["kubectl", "--kubeconfig", kubeconfig, "rollout", "status", "deployment/ingress-nginx-controller", "--namespace", "ingress-nginx", "--timeout=90s"]);
    cluster.failRollout = true;
    await expect(cluster.manager().install(ingress, "/chart")).rejects.toThrow("rollout timeout");
    expect(cluster.calls.some(call => call.args.includes("uninstall") || call.args.includes("delete"))).toBe(false);
  });

  test("parses kubectl JSON streams and Lists with escaped annotation content", () => {
    const first = { kind: "ConfigMap", metadata: { name: "one" }, data: { text: '}{ "quoted" \\ path', nested: JSON.stringify(service) } };
    const second = structuredClone(service);
    expect(jsonObjects(JSON.stringify(first) + "\n" + JSON.stringify(second))).toEqual([first, second]);
    expect(jsonObjects(asList([first, second]))).toEqual([first, second]);
    expect(jsonObjects(" \n")).toEqual([]);
    expect(() => jsonObjects(JSON.stringify(first) + '{"kind":')).toThrow("Incomplete");
    expect(() => jsonObjects(JSON.stringify(first) + "garbage")).toThrow("Expected");
    expect(() => jsonObjects('{"kind": invalid}')).toThrow();
  });

  test("retains provider pins and refuses ingress on K3s", () => {
    expect(ingress.artifact.version).toBe("4.6.0");
    expect(selectAddon("ingress", "eks").artifact.version).toBe("4.6.1");
    expect(selectAddon("ingress", "aks").artifact).toEqual(selectAddon("ingress", "gke").artifact);
    expect(cert.artifact.version).toBe("v1.11.0");
    expect(() => selectAddon("ingress", "k3s")).toThrow("Traefik");
    expect(() => selectAddon("cert-manager", "kind")).toThrow();
  });

  test("rejects a corrupt cached chart without invoking a cluster command", async () => {
    const dir = mkdtempSync(join(tmpdir(), "ops-chart-test-"));
    try {
      writeFileSync(join(dir, basename(new URL(ingress.artifact.url).pathname)), "invalid archive");
      await expect(cacheChart(ingress, { OPS_ADDON_CACHE: dir })).rejects.toThrow("checksum mismatch");
    } finally { rmSync(dir, { recursive: true, force: true }); }
  });

  test("local rendering only invokes helm template", async () => {
    const cluster = new Cluster();
    await render(ingress, "/cached/chart.tgz", cluster);
    expect(cluster.calls).toHaveLength(1);
    expect(cluster.calls[0].args.slice(0, 4)).toEqual(["helm", "template", "ingress-nginx", "/cached/chart.tgz"]);
    expect(cluster.calls[0].args).not.toContain("--kubeconfig");
  });

  test("image discovery includes init containers, hooks and the dynamic ACME solver", () => {
    const discovered = images([{ spec: { template: { spec: {
      initContainers: [{ image: "init:1" }], containers: [{ image: "controller:1", args: ["--acme-http01-solver-image=solver:1"] }],
    } } } }, { kind: "Job", spec: { template: { spec: { containers: [{ image: "hook:1" }, { image: "controller:1" }] } } } }]);
    expect(discovered).toEqual(["controller:1", "hook:1", "init:1", "solver:1"]);
  });

  test("conflicting actions fail before any external command", async () => {
    const cluster = new Cluster();
    await expect(main(["ingress", "kind", "--adopt", "--uninstall"], {}, cluster)).rejects.toThrow("cannot be combined");
    await expect(main(["render", "ingress", "kind", "--adopt"], {}, cluster)).rejects.toThrow("cannot be combined");
    expect(cluster.calls).toHaveLength(0);
  });
});

describe("installation and ownership", () => {
  test("fresh install waits on the selected cluster without taking ownership", async () => {
    const cluster = new Cluster();
    await cluster.manager().install(ingress, "/cached/chart.tgz");
    const args = cluster.mutations()[0].args;
    expect(args).toContain("--install");
    expect(args).toContain("--wait-for-jobs");
    expect(args).toContain("90s");
    expect(args).not.toContain("--take-ownership");
    expect(args).not.toContain("--atomic");
    expect(args).not.toContain("--force");
    for (const call of cluster.calls.filter(c => c.args[1] !== "template")) {
      expect(call.args[call.args.indexOf("--kubeconfig") + 1]).toBe(kubeconfig);
    }
  });

  test("missing cert-manager CRDs are created before Helm and kept out of release values", async () => {
    const cluster = new Cluster(cert);
    cluster.desired = [crd];
    await cluster.manager().install(cert, "/cached/cert.tgz");
    expect(cluster.mutations().map(call => call.args[0])).toEqual(["kubectl", "helm"]);
    expect(cluster.mutations()[0].args).toContain("create");
    expect(cluster.calls.some(call => call.args.includes("--for=condition=Established"))).toBe(true);
    expect(cluster.mutations()[1].args).not.toContain("installCRDs=true");
  });

  test("repeat install reuses owned release values without replacing CRDs", async () => {
    const cluster = new Cluster(cert).ownRelease();
    cluster.desired = [crd];
    cluster.current = [{ ...crd, metadata: { ...crd.metadata, labels: { "openserverless.org/addon-owner": "ops" } } }];
    await cluster.manager().install(cert, "/cached/cert.tgz");
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args).toContain("--reuse-values");
  });

  test("CRDs retained after uninstall can be reused without adoption", async () => {
    const cluster = new Cluster(cert);
    cluster.desired = [crd];
    cluster.current = [{ ...crd, metadata: { ...crd.metadata, labels: { "openserverless.org/addon-owner": "ops" } } }];
    await cluster.manager().install(cert, "/cached/cert.tgz");
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args).not.toContain("--take-ownership");
  });

  test("records ownership of legacy CRDs outside Helm without changing their schema", async () => {
    const cluster = new Cluster(cert).ownRelease();
    cluster.desired = [crd];
    cluster.current = [{ ...crd, metadata: { ...crd.metadata, resourceVersion: "42" } }];
    await cluster.manager().install(cert, "/chart");
    const patch = cluster.mutations().find(call => call.args.includes("patch"))!;
    expect(JSON.parse(patch.args[patch.args.indexOf("-p") + 1])).toEqual({ metadata: {
      resourceVersion: "42", labels: { "openserverless.org/addon-owner": "ops" },
    } });
    expect(cluster.mutations()[0].args).toContain("upgrade");
    cluster.current[0].metadata.labels = { "openserverless.org/addon-owner": "ops" };
    cluster.release = false;
    cluster.calls = [];
    await cluster.manager().install(cert, "/chart");
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args).not.toContain("--take-ownership");
  });

  test("an external release is refused before any cluster mutation", async () => {
    const cluster = new Cluster();
    cluster.release = true;
    cluster.values = {};
    await expect(cluster.manager().install(ingress, "/chart", true)).rejects.toThrow("not managed");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("a manually changed chart pin is not downgraded", async () => {
    const cluster = new Cluster().ownRelease();
    cluster.chartOverride = "ingress-nginx-9.0.0";
    await expect(cluster.manager().install(ingress, "/chart")).rejects.toThrow("different chart version");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("existing resources require explicit adoption", async () => {
    const cluster = new Cluster();
    cluster.current = [legacyService()];
    await expect(cluster.manager().install(ingress, "/chart")).rejects.toThrow("--adopt");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("adoption validates the legacy source and live state before Helm", async () => {
    const cluster = new Cluster();
    const live = legacyService();
    live.spec.clusterIP = "10.96.1.2";
    live.spec.ports[0].nodePort = 30123;
    cluster.current = [live];
    await cluster.manager().install(ingress, "/chart", true);
    const checks = cluster.calls.filter(call => call.args.includes("--dry-run=server"));
    expect(checks).toHaveLength(1);
    const input = JSON.parse(checks[0].input!);
    expect(input.items[0].spec.clusterIP).toBe("10.96.1.2");
    expect(input.items[0].spec.ports[0].nodePort).toBe(30123);
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args).toContain("--take-ownership");
  });

  test("live drift blocks adoption before Helm or CRD changes", async () => {
    const cluster = new Cluster();
    cluster.current = [legacyService()];
    cluster.checked = [legacyService()];
    cluster.current[0].spec.ports[0].port = 8080;
    await expect(cluster.manager().install(ingress, "/chart", true)).rejects.toThrow("live configuration changes");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("an interrupted adoption can be retried explicitly with the same legacy checks", async () => {
    const cluster = new Cluster().ownRelease();
    cluster.current = [legacyService()];
    await cluster.manager().install(ingress, "/chart", true);
    expect(cluster.calls.some(call => call.args.includes("--dry-run=server"))).toBe(true);
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args).toContain("--take-ownership");
    expect(cluster.mutations()[0].args).toContain("--reuse-values");
  });

  test("a release record alone does not authorize adoption of unowned resources", async () => {
    const cluster = new Cluster().ownRelease();
    cluster.current = [legacyService()];
    await expect(cluster.manager().install(ingress, "/chart")).rejects.toThrow("--adopt");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("modified or missing last-applied configuration is not trusted", () => {
    const changed = legacyService();
    const applied = structuredClone(service);
    applied.spec.ports[0].port = 8080;
    changed.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"] = JSON.stringify(applied);
    expect(() => legacyManifest(changed, ingress)).toThrow("differs from");
    expect(() => legacyManifest(service, ingress)).toThrow("not a recognized legacy");
  });

  test("legacy fingerprint tolerates kubectl's empty annotations and null timestamp", () => {
    const live = legacyService();
    const applied: any = structuredClone(service);
    applied.metadata.annotations = {};
    applied.metadata.creationTimestamp = null;
    live.metadata.annotations["kubectl.kubernetes.io/last-applied-configuration"] = JSON.stringify(applied);
    expect(legacyManifest(live, ingress).spec).toEqual(service.spec);
  });

  test("foreign hooks, Helm ownership and GitOps ownership are refused", () => {
    for (const metadata of [
      { annotations: { "meta.helm.sh/release-name": "someone-else" } },
      { annotations: { "argocd.argoproj.io/tracking-id": "other" } },
      { labels: { "helm.toolkit.fluxcd.io/name": "other" } },
    ]) {
      expect(() => checkOwnership({ ...service, metadata: { ...service.metadata, ...metadata } }, ingress, false)).toThrow();
    }
  });

  test("failed owned Helm hooks can be retried", () => {
    expect(() => checkOwnership({ kind: "Job", metadata: { name: "ingress-nginx-admission-create", labels: {
      "app.kubernetes.io/managed-by": "Helm", "openserverless.org/addon-owner": "ops",
    }, annotations: { "helm.sh/hook": "pre-install,pre-upgrade" } } }, ingress, true)).not.toThrow();
  });

  test("a failed install propagates the failure without uninstall or cleanup", async () => {
    const cluster = new Cluster();
    cluster.failUpgrade = true;
    await expect(cluster.manager().install(ingress, "/chart")).rejects.toThrow("readiness failure");
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.calls.some(call => call.args.includes("uninstall") || call.args.includes("delete"))).toBe(false);
  });
});

describe("uninstall", () => {
  test("legacy DEL dispatches uninstall without downloading a chart", async () => {
    const cluster = new Cluster().ownRelease();
    await main(["ingress", "kind"], { OPS_ADDON_DELETE: "1", KUBECONFIG: kubeconfig }, cluster);
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args[1]).toBe("uninstall");
  });

  test("unmanaged manifest installations are left alone", async () => {
    const cluster = new Cluster();
    cluster.current = [legacyService()];
    await cluster.manager().uninstall(ingress);
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("owned cert-manager removal only uninstalls Helm", async () => {
    const cluster = new Cluster(cert).ownRelease();
    await cluster.manager().uninstall(cert);
    expect(cluster.mutations()).toHaveLength(1);
    expect(cluster.mutations()[0].args.slice(0, 2)).toEqual(["helm", "uninstall"]);
  });

  test("uninstall refuses legacy resources left by an interrupted adoption", async () => {
    const cluster = new Cluster().ownRelease();
    cluster.current = [legacyService()];
    await expect(cluster.manager().uninstall(ingress)).rejects.toThrow("ownership metadata");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("uninstall refuses CRDs even if the stored values say installCRDs=false", async () => {
    const cluster = new Cluster(cert).ownRelease();
    cluster.desired = [crd];
    await expect(cluster.manager().uninstall(cert)).rejects.toThrow("CRDs or namespaces");
    expect(cluster.mutations()).toHaveLength(0);
  });

  test("refuses uninstall if CRDs were added to the Helm release", async () => {
    const cluster = new Cluster(cert).ownRelease();
    cluster.values.installCRDs = true;
    await expect(cluster.manager().uninstall(cert)).rejects.toThrow("manages cert-manager CRDs");
    expect(cluster.mutations()).toHaveLength(0);
  });
});
