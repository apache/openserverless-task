<!---
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
# Tasks `ops setup`

Manage installation

## Synopsis

```text
Usage:
  setup mini [<apihost>]
  setup devcluster [--uninstall|--status|[--skip-check-ports] [--skip-preload-images]]
  setup cluster [<context>] [--uninstall|--status]
  setup server <server> [<user>] [--uninstall|--status]
  setup status
  setup uninstall
  setup devcontainer
```

## Commands

```
  setup mini          deploy mini Apache OpenServerless, slim local installation available as http://devel.miniops.me (or your local domain)
  setup cluster       deploy Apache OpenServerless in the Kubernetes cluster using the <context>, default the current
  setup devcluster    deploy Apache OpenServerless in a devcluster created locally
                      you need Docker Desktop available with at least 6G of memory assigned
  setup server        create a Kubernetes in server <server> and deploy Apache OpenServerless
                      the server must be accessible with ssh using the <user> with sudo power, default root
  setup status        show the status of the last installation
  setup uninstall     uninstall the last installation
  setup devcontainer  manage a devcontainer accessible with ssh
```

## Options

```
  --uninstall           execute an uninstall instead of an installation
  --status              show the status instead of an installation
  --skip-check-ports    skip the check of already used ports
  --skip-preload-images skip the preload images step
```

## Subtasks

- `kubernetes`: prepare kubernetes
- `nuvolaris`: install nuvolaris
- `docker`: prepare docker
