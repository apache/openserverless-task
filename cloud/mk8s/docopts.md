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
# Tasks  `ops cloud mk8s`

Create and Manage an mk8s kubernetes cluster

## Synopsis

```text
Usage:
  mk8s create <server> [<user>]
  mk8s delete <server> [<user>]
  mk8s info
  mk8s kubeconfig <server> [<user>]
  mk8s status
```

## Commands

```
  create     create a mk8s with ssh in <server> using <user> with sudo
  delete     uninstall microk8s with ssh in <server> using <user> with sudo
  info       info on the server
  kubeconfig recover the kubeconfig from a server <server> with microk8s
  status     status of the server
```
