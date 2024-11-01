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
# Tasks  `ops cloud aws`

Create and Manage an Amazon Virtual Machines and Dns Zones

## Synopsis

```text
Usage:
  aws vm-list
  aws vm-create <name>
  aws vm-delete <name>
  aws vm-getip  <name>
  aws zone-create <zone>
  aws zone-delete <zone>
  aws zone-list  [<zone>]
  aws zone-update <zone> (--host=<host>|--wildcard) (--vm=<vm>|--ip=<ip>|--cname=<cname>)
```

## Commands

```
Commands:
  vm-list     lists the vm and their ips
  vm-create   create a vm
  vm-getip    get ip
  vm-delete   delete the vm
  zone-create create a zone - you will have to delegate the zone 
              from the parent zone assigning the nameservers
  zone-delete delete a zone
  zone-list   list zones
  zone-update update a zone with an ip, a cname or the ip of a vm
```