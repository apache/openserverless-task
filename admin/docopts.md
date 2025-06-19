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
# Tasks  `ops admin`

Administer OpenServerless users.

## Synopsis

In OpenServerless, users are namespaces.
You can create namespaces and choose which services to enable.

```text
Usage:
  admin adduser <username> <email> <password> [--all] [--redis] [--mongodb] [--minio] [--postgres] [--milvus] [--storagequota=<quota>|auto]
  admin deleteuser <username>
  admin compact [--ttl=<ttl>|10]
  admin usage [--debug]
```

## Commands
```
  admin adduser       create a new user in OpenServerless with the username, email and password provided
  admin deleteuser    delete a user from the OpenServerless installation via the username provided
  admin compact       create a one shot job which executes couchdb compact against all available dbs
  admin usage         calculates and displays PVC disk usage statistics for bound volumes. Shows Total, Size and Available storage per PVC
```

## Options
```
  --all                   enable all services
  --redis                 enable redis
  --mongodb               enable mongodb
  --minio                 enable minio
  --postgres              enable postgres
  --milvus                enable milvus vector db
  --storagequota=<quota>
  --ttl=<seconds>         modify the job ttl after finished (defaults to 10 seconds)
  --debug         enable debug logging
```