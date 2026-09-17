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
import { cacheChart, images, objects, ProcessRunner, render, selectAddon, type Addon } from "./addons";

const runner = new ProcessRunner();
async function chartObjects(addon: Addon, withCRDs = false) {
  return render(addon, await cacheChart(addon), runner, withCRDs);
}

describe("real pinned charts (rendering only, no Kubernetes access)", () => {
  for (const [provider, version, serviceType] of [
    ["kind", "v1.7.0", "NodePort"], ["eks", "v1.7.1", "LoadBalancer"],
    ["aks", "v1.8.1", "LoadBalancer"], ["gke", "v1.8.1", "LoadBalancer"],
  ]) {
    test(`${provider}: controller, routing, service and provider configuration`, async () => {
      const resources = await chartObjects(selectAddon("ingress", provider));
      const get = (kind: string, name: string) => resources.find(obj => obj.kind === kind && obj.metadata.name === name)!;
      const deployment = get("Deployment", "ingress-nginx-controller");
      const pod = deployment.spec.template.spec;
      const controller = pod.containers[0];
      const service = get("Service", "ingress-nginx-controller");
      expect(deployment.metadata.namespace).toBe("ingress-nginx");
      expect(controller.image.split("@")[0]).toBe(`registry.k8s.io/ingress-nginx/controller:${version}`);
      expect(controller.args).toContain("--election-id=ingress-nginx-leader");
      expect(controller.args).toContain("--ingress-class=nginx");
      expect(get("IngressClass", "nginx").spec.controller).toBe("k8s.io/ingress-nginx");
      expect(get("ConfigMap", "ingress-nginx-controller").data["allow-snippet-annotations"]).toBe("true");
      expect(service.spec.type).toBe(serviceType);
      expect(service.spec.ports.map((port: any) => port.port)).toEqual([80, 443]);
      expect(service.spec.selector).toEqual(deployment.spec.selector.matchLabels);
      expect(pod.serviceAccountName).toBe("ingress-nginx");
      if (provider !== "eks") {
        expect(deployment.spec.strategy).toEqual({ type: "RollingUpdate", rollingUpdate: { maxUnavailable: 1 } });
      }
      const resourceImages = images(resources);
      if (provider === "kind") {
        expect(controller.image).toBe("registry.k8s.io/ingress-nginx/controller:v1.7.0");
        expect(controller.ports.map((port: any) => port.hostPort)).toEqual([80, 443]);
        expect(pod.nodeSelector["ingress-ready"]).toBe("true");
        expect(pod.tolerations.map((t: any) => t.key)).toContain("node-role.kubernetes.io/control-plane");
        expect(controller.args).toContain("--watch-ingress-without-class=true");
        expect(controller.args).toContain("--publish-status-address=localhost");
        expect(controller.args.some((arg: string) => arg.startsWith("--publish-service"))).toBe(false);
        expect(pod.terminationGracePeriodSeconds).toBe(0);
        expect(resources.some(obj => obj.kind === "ValidatingWebhookConfiguration")).toBe(false);
        expect(resourceImages).toHaveLength(1);
      } else {
        expect(service.spec.externalTrafficPolicy).toBe("Local");
        expect(controller.args).toContain("--publish-service=$(POD_NAMESPACE)/ingress-nginx-controller");
        expect(controller.image).toContain("@sha256:");
        expect(get("ValidatingWebhookConfiguration", "ingress-nginx-admission")).toBeDefined();
        expect(resourceImages.some(image => image.includes("kube-webhook-certgen"))).toBe(true);
        for (const hook of resources.filter(obj => obj.metadata.annotations?.["helm.sh/hook"])) {
          expect(hook.metadata.labels["openserverless.org/addon-owner"]).toBe("ops");
        }
      }
      if (provider === "eks") {
        expect(service.metadata.annotations).toEqual({
          "service.beta.kubernetes.io/aws-load-balancer-backend-protocol": "tcp",
          "service.beta.kubernetes.io/aws-load-balancer-cross-zone-load-balancing-enabled": "true",
          "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
        });
      } else {
        expect(service.metadata.annotations?.["service.beta.kubernetes.io/aws-load-balancer-type"]).toBeUndefined();
      }
    }, 120000);
  }

  test("cert-manager keeps CRDs outside the release and exposes all required images", async () => {
    const addon = selectAddon("cert-manager");
    const released = await chartObjects(addon);
    expect(released.some(obj => obj.kind === "CustomResourceDefinition")).toBe(false);
    const complete = await chartObjects(addon, true);
    const crds = complete.filter(obj => obj.kind === "CustomResourceDefinition");
    expect(crds.map(obj => obj.metadata.name).sort()).toEqual([
      "certificaterequests.cert-manager.io", "certificates.cert-manager.io",
      "challenges.acme.cert-manager.io", "clusterissuers.cert-manager.io",
      "issuers.cert-manager.io", "orders.acme.cert-manager.io",
    ]);
    expect(complete.some(obj => obj.kind === "Namespace")).toBe(false);
    expect(complete.filter(obj => obj.kind === "Deployment").map(obj => obj.metadata.name).sort()).toEqual([
      "cert-manager", "cert-manager-cainjector", "cert-manager-webhook",
    ]);
    expect(complete.find(obj => obj.kind === "Service" && obj.metadata.name === "cert-manager")).toBeDefined();
    expect(images(complete)).toEqual([
      "quay.io/jetstack/cert-manager-acmesolver:v1.11.0",
      "quay.io/jetstack/cert-manager-cainjector:v1.11.0",
      "quay.io/jetstack/cert-manager-controller:v1.11.0",
      "quay.io/jetstack/cert-manager-ctl:v1.11.0",
      "quay.io/jetstack/cert-manager-webhook:v1.11.0",
    ]);
  }, 120000);

  test("the public renderer produces a parseable manifest stream", async () => {
    const output = await runner.run([process.execPath, `${import.meta.dir}/addons.ts`, "render", "ingress", "kind"]);
    const resources = objects(output);
    expect(resources.filter(obj => obj.kind === "Deployment")).toHaveLength(1);
    expect(resources.every(obj => obj.apiVersion && obj.kind && obj.metadata.name)).toBe(true);
  }, 120000);
});
