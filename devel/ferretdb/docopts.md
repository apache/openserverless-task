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
# Tasks  `ops devel ferretdb`

OpenServerless Ferret Db Development Utilities.

## Synopsis

```text
Usage:
    ferretdb find <collection> [--format=table|json]
    ferretdb submit <collection> <jsonfile>
    ferretdb delete <collection>
    ferretdb command [<jsonfile>] [--format=table|json]
```

## Commands

```
    ferretdb find         search all elements in FerretDb/MongoDb collection
    ferretdb submit       submit <file> to a FerretDb/MongoDb  collection
    ferretdb delete       empty the FerretDb/MongoDb collection
    ferretdb command      send a raw command from json file passed on stdin. See https://www.mongodb.com/docs/manual/reference/method/db.runCommand/#mongodb-method-db.runCommand
```

## Options

```
--format         Output data as table or json. default is json
```