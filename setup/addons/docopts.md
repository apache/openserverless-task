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

# Tasks `ops setup addons`

Manage the ingress-nginx and cert-manager versions used by OpenServerless 0.9.0.

## Synopsis

```text
Usage:
  addons ingress <provider> [--adopt|--uninstall] [--kubeconfig=<file>] [--timeout=<duration>]
  addons cert-manager [--adopt|--uninstall] [--kubeconfig=<file>] [--timeout=<duration>]
  addons render <component> [<provider>]
  addons images <component> [<provider>]
  addons download <component> [<provider>]
```

## Commands

```text
  ingress       install ingress-nginx for kind, eks, aks or gke
  cert-manager  install cert-manager, keeping its CRDs outside the Helm release
  render        render the pinned chart, including hooks and CRDs, for review
  images        list chart images, including hooks and the HTTP01 solver
  download      download and verify a chart in the local cache
```

`<component>` is `ingress` or `cert-manager`. Only ingress takes a provider.
K3s continues to use Traefik; MicroK8s and OpenShift retain their existing
platform-managed components.

## Options

```text
  --adopt                 adopt an unmodified legacy OpenServerless installation
  --uninstall             uninstall only a release managed by these tasks
  --kubeconfig=<file>      kubeconfig path; otherwise use KUBECONFIG, OPS_TMP/kubeconfig or ~/.kube/config
  --timeout=<duration>    readiness timeout [default: 10m]
```

`render`, `images` and `download` do not contact Kubernetes. Charts are cached
under `$OPS_HOME/cache/helm-addons` (`~/.ops/cache/helm-addons` by default),
or in `OPS_ADDON_CACHE` when set. Each cached archive is checked against the
SHA-256 digest in `charts.json` before use.

An installation from the old manifests requires explicit `--adopt`. Other Helm
releases and customized manifests are refused. Review the
[migration and validation notes](README.md) before adopting an existing cluster.
