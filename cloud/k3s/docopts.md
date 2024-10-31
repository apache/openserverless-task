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
# Tasks  `ops cloud k3s`

Create and Manage K3S cluster

## Synopsis

```text
Usage:
  k3s create <server> [<user>]
  k3s delete <server> [<user>]
  k3s info
  k3s kubeconfig <server> [<user>]
  k3s status
```

## Commands

```
  create     create a k3s with ssh in <server> using <user> with sudo
  delete     uninstall k3s with ssh in <server> using <username> with sudo
  info       info on the server
  kubeconfig recover the kubeconfig from a k3s server <server> with user <username>
  status     status of the server
```