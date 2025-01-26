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
# Task:  `ops env`

OpenServerless Env Utilities

## Synopsis

```text
Usage:
  env add <args>...
  env remove <args>...
  env list [--format=table|raw|json]
```

## Commands

```
-  add          add or change one or multiple env to user metadata. ops env add VARA=valuea VARB=valueb
-  remove       remove one or multiple env from user metadata. ops env remove VARA VARB
-  list         list envs from user metadata
```

## Options

```
--format         Output data as table, as raw env or as json. default is table
```