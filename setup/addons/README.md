<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# Helm add-ons for OpenServerless 0.9.0

The provider tasks delegate installation to `addons.ts`, using Bun and Helm
already supplied by OPS. Existing command paths remain available. No cluster
or Docker cleanup is performed by this runner.

| Component/profile | Chart | Controller |
| --- | --- | --- |
| ingress / Kind | ingress-nginx 4.6.0 | v1.7.0 |
| ingress / EKS | ingress-nginx 4.6.1 | v1.7.1 |
| ingress / AKS, GKE | ingress-nginx 4.7.1 | v1.8.1 |
| cert-manager | cert-manager v1.11.0 | v1.11.0 |

These pins preserve the previous manifests for the installation refactoring;
they are not recommendations for new component versions. In particular,
[ingress-nginx maintenance ended in March 2026](https://kubernetes.io/blog/2025/11/11/ingress-nginx-retirement/).
Controller replacement and compatibility with newer Kubernetes versions need
separate validation. This change retains the existing K3s version and
Traefik configuration.

`charts.json` records the official download URLs and archive checksums from
the ingress-nginx and Jetstack Helm repository indexes. The renderer and the
installer use the same cached archives and values. No chart archives or
generated Kubernetes manifests are committed. Pre-cache the required charts
with `download` when preparing an offline installation.

## Existing commands

- `ops setup docker ingress`: Kind ingress-nginx.
- `ops cloud aks ingress`, `ops cloud eks ingress`, `ops cloud gke ingress`:
  provider-specific ingress-nginx.
- The corresponding `certman` tasks and `ops cloud k3s cert-manager`:
  cert-manager.
- `DEL=1` on the cloud `ingress`/`certman` tasks uninstalls a managed release.
  The old cert-manager branches incorrectly ran `apply` when `DEL` was set.
- `update-yaml` and `get-cert-manager` remain as compatibility aliases for
  downloading the pinned charts; they no longer write manifests into the task
  checkout.

The AKS wrappers use `$OPS_TMP/kubeconfig_$AKS_NAME`, which is the file produced
by the existing AKS `kubeconfig` task. The other provider wrappers retain their
explicit `$OPS_TMP/kubeconfig` target. The common commands accept
`--kubeconfig` and otherwise honor the selected environment as documented in
`docopts.md`.

## Adoption and removal

For a fresh installation, run the existing provider setup or the common
commands. Repeated installation reconciles the same named Helm release and
waits for readiness. There is no automatic adoption of pre-existing resources.
After Helm finishes, the runner explicitly waits for each Deployment rollout:
Helm's own readiness threshold can allow an unavailable single replica when
the preserved update strategy sets `maxUnavailable: 1`. Each rollout uses the
requested timeout, so total execution can exceed that timeout across stages.

For an existing installation, first review its state and the chart output:

```sh
ops setup addons render ingress kind > ingress-review.yaml
ops setup addons render cert-manager > cert-manager-review.yaml
```

After taking a cluster backup and confirming that this is your OpenServerless
installation, explicitly adopt each installed component:

```sh
ops setup addons ingress kind --adopt --kubeconfig=/path/to/kubeconfig
ops setup addons cert-manager --adopt --kubeconfig=/path/to/kubeconfig
```

Substitute `eks`, `aks` or `gke` for `kind` as appropriate. Do not install
ingress-nginx on K3s, MicroK8s or OpenShift through these commands.

Adoption checks every existing chart resource, including hook resources. It
rejects foreign Helm/controller ownership and requires the original
`kubectl.kubernetes.io/last-applied-configuration` to match a fingerprint in
`legacy.json`. Those fingerprints come from the removed 0.9.0 manifests at
upstream commit `c477ba438e566a1e620a362fba2c58c890b47784`. A server-side
dry-run replacement validates that the live resource has not drifted from that
configuration, allowing Kubernetes-allocated service addresses/ports,
webhook CA bundles and generated Job selectors. Missing last-applied metadata
or customized resources require manual review instead of automatic adoption.
The flag is an explicit assertion that the legacy installation is yours;
standard upstream labels alone cannot establish its origin.

Only after these checks does Helm receive `--take-ownership`. Existing ingress
Service addresses and node ports are carried into release values. There is no
`--force`, `--atomic` or automatic uninstall on failure. A failed owned release
is left available for inspection and retry. Do not switch provider profiles or
chart versions implicitly; the runner refuses a release with a different pin.
An interrupted adoption can be retried with the same `--adopt` command, which
checks any remaining legacy resources again. Uninstall verifies the live
ownership of release resources before removing them; a failed adoption's
release record alone is not sufficient to authorize deleting legacy resources.

cert-manager CRDs are rendered from the same pinned chart, created separately
when missing, and waited on before Helm installation. Existing CRD schemas are
not overwritten. `installCRDs` stays false for the Helm release. The runner
recognizes both newly created and validated adopted CRDs through the
`openserverless.org/addon-owner: ops` label. Adoption adds only this metadata
after a successful rollout, allowing reinstall without another `--adopt`.
Uninstall
retains namespaces, CRDs, Issuers, Certificates and TLS secrets; certificate
renewal pauses while the controller is absent. A release that manages CRDs is
refused to avoid deleting those resources. See the
[cert-manager Helm lifecycle documentation](https://cert-manager.io/docs/installation/helm/).

The operator repository's development cluster tasks still use their own copied
manifests. This change does not migrate those independent installation paths.

## Validation

Local checks do not require a cluster:

```sh
ops tests addons
ops setup addons render ingress kind
ops setup addons images cert-manager
```

The Bun tests exercise lifecycle failures and adoption with a fake command
runner, and render the real pinned charts with Helm. Chart rendering downloads
archives only if they are absent from the verified local cache.

The following integration checks require an explicitly selected test cluster
and must be run separately. They are not triggered by `ops tests addons`:

1. Fresh installation and a second installation of each component: verify the
   releases and Deployments become ready, with stable Service addresses.
2. Adoption from the previous Kind manifests: record Service UID, cluster IP,
   node ports and HTTP responses before/after; ensure the Service is retained.
3. Adoption of cert-manager with an existing self-signed Issuer, Certificate
   and TLS Secret: verify their UIDs/data survive and a new Certificate becomes
   Ready. Repeat install, then exercise uninstall/reinstall in that test cluster.
4. Check that unrelated Helm releases and modified legacy resources are refused
   without cluster mutations, and failed install/retry does not trigger cleanup.
5. Run the OpenServerless HTTP deployment/login and SSO mock tests. Add a
   dedicated certificate issuance test: `testing/tests/2-ssl.sh` skips Kind.
6. Validate AKS/GKE LoadBalancer and EKS NLB behavior on those providers. Local
   rendering alone does not establish cloud load-balancer readiness.

Keep the existing VM and host Docker workloads intact when preparing these
integration checks.
