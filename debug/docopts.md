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
# Tasks  `ops debug`

Debugging various parts of OpenServerless

## Synopsis
```text
Usage:
    debug apihost           
    debug certs             
    debug config            
    debug images            
    debug ingress           
    debug kube              
    debug lb                
    debug log               
    debug route             
    debug runtimes          
    debug status            
    debug watch             
    debug operator:version  
```

## Commands

```text
    apihost           show current apihost
    certs             show certificates
    config            show deployed configuration
    images            show current images
    ingress           show ingresses
    kube              kubernetes support subcommand prefix
    lb                show ingress load balancer
    log               show logs
    route             show openshift route
    runtimes          show runtimes
    status            show deployment status
    watch             watch nodes and pod deployment
    operator:version  show operator versions
```