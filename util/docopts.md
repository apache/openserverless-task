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
# Task:  `ops util`

OpenServerless Utilities

## Synopsis

```text
Usage:
  util system
  util update-cli
  util check-operator-version <version>
  util secrets
  util nosecrets
  util user-secrets <username>
  util no-user-secrets <username>
  util kubectl <args>...
  util kubeconfig
  util config <configjson> [--override] [--showhelp]
  util clean
  util upload [<folder>] [--batchsize=<batchsize>] [--verbose] [--clean]
  util add-secret <args>...
  util remove-secret <args>...
  util list-secrets
  util ingress-type
  util edit [<plugin>]
  util link-plugin <plugin>
  util docker-proxy [<port>] [<host>] [--remove]
```

## Commands

```
-  system                  system info (<os>-<arch> in Go format)
-  update-cli              update the cli downloading the binary
-  check-operator-version  check if you need to update the operator
-  secrets                 generate system secrets 
-  nosecrets               remove system secrets
-  user-secrets            generate user secrets for the given user
-  no-user-secrets         remove user secrets for the given user
-  kubectl                 execute kubectl on current kubeconfig
-  kubeconfig              export OVERWRITING current kubeconfig to ~/.kube/config
-  config                  update configuration file interactively
-  clean                   clean up the web bucket
-  upload                  uploads a folder to the web bucket in OpenServerless.
-  add-secret              add one or multiple secrets to user metadata
-  remove-secret           remove one or multiple secrets to user metadata
-  list-secrets            list secrets from user metadata
-  ingress-type            return the ingress type
-  edit                    edit (with vscode) the current tasks or a plugin
-  link-plugin             link the <plugin> in current directory to the global list
-  docker-proxy            launch (or remove) in docker a proxy listening in public <port> (default 8080) to the <host> (default devel.miniops.me)
```

## Options

```
  --showhelp              Show configuration tool help.
  --override               Override the current configuration.
  --verbose                Provide more details.
  --clean                  Remove all files from the web bucket before upload.
  --batchsize=<batchsize>  Number of concurrent web uploads
```