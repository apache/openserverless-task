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
# Tasks  `ops ide`

OpenServerless Ide Development Utilities.

## Synopsis

```text
Usage:
    ide login [<username>] [<apihost>]
    ide devel [--fast] [--dry-run]
    ide deploy [<action>] [--dry-run]
    ide undeploy [<action>] [--dry-run]
    ide clean
    ide setup 
    ide serve
    ide poll
    ide shell
    ide kill
    ide python
    ide nodejs
    ide devcontainer
```

## Commands

```
    ide login               login in openserverless
    ide devel               activate development mode
    ide deploy              deploy everything or just one action
    ide undeploy            undeploy actions and packages from the current project or just one action
    ide clean               clean the temporay files
    ide setup               setup the ide
    ide serve               serve web area
    ide kill                kill current devel or deploy job
    ide poll                poll for logs
    ide shell               start a shell with current env
    ide devcontainer        add a devcontainer configuration
    ide python              python subcommands
    ide nodejs              nodejs subcommands
```

## Options

```
--fast          Skip the initial deployment step and go in incremental update mode
--dry-run       Simulates the execution without making any actual changes 
```
