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
# Tasks  `ops config`

Configure OpenServerless

## Synopsis

```text
Usage:
  config (enable|disable) [--all] [--redis] [--mongodb] [--minio] [--cron] [--static] [--postgres] [--prometheus] [--slack] [--mail] [--affinity] [--tolerations] [--quota] [--milvus] [--registry]
  config apihost (<apihost>|auto) [--tls=<email>] [--protocol=<http/https>|auto]
  config runtimes [<runtimesjson>]  
  config slack [--apiurl=<slackapiurl>] [--channel=<slackchannel>]
  config mail  [--mailuser=<mailuser>] [--mailpwd=<mailpwd>] [--mailfrom=<mailfrom>] [--mailto=<mailto>]
  config volumes [--couchdb=<couchdb>] [--kafka=<kafka>] [--pgvol=<postgres>] [--storage=<storage>] [--alerting=<alerting>] [--zookeeper=<zookeeper>] [--redisvol=<redis>] [--mongodbvol=<mongodb>] [--etcdvol=<etcd>] [--mvvol=<milvus>] [--mvzookvol=<milvuszook>] [--pulsarjournalvol=<pulsarjournal>] [--pulsarledgelvol=<pulsarledge>]  
  config controller [--javaopts=<javaopts>] [--loglevel=<loglevel>] [--replicas=<replicas>]
  config ingress [--class=<auto|nginx|traefik|public>]
  config invoker [--javaopts=<javaopts>] [--poolmemory=<poolmemory>] [--timeoutsrun=<timeoutsrun>] [--timeoutslogs=<timeoutslogs>] [--loglevel=<loglevel>] [--replicas=<replicas>]
  config limits [--time=<time>] [--memory=<memory>] [--sequencelength=<sequencelength>] [--perminute=<perminute>] [--concurrent=<concurrent>] [--triggerperminute=<triggerperminute>] [--activation_max_payload=<activation_max_payload>] [--blackbox_fraction=<blackbox_fraction>]
  config storage [--class=<storage_class>] [--provisioner=<storage_provisioner>]
  config postgres [--failover] [--backup] [--schedule=<cron_expression>] [--replicas=<replicas>]
  config minio [--s3] [--console]
  config milvus [--maxdbnum=<maxdbnum>]
  config etcd [--replicas=<replicas>] [--quota_backend_bytes=<bytes>] [--auto_compaction_retention=<retention_period>]  
  config aws [--access=<access>] [--secret=<secret>] [--region=<region>] [--image=<image>] [--vm=<vm>] [--vmuser=<vmuser>] [--disk=<disk>] [--key=<key>] 
  config eks [--project=<project>] [--access=<access>] [--secret=<secret>] [--region=<region>] [--name=<name>] [--count=<count>] [--vm=<vm>] [--disk=<disk>] [--key=<key>] [--kubever=<kubever>]
  config gcloud [--project=<project>] [--region=<region>] [--vm=<vm>] [--disk=<disk>] [--key=<key>] [--image=<image>]
  config gke [--name=<name>] [--project=<project>] [--region=<region>] [--count=<count>] [--vm=<vm>] [--disk=<disk>]
  config azcloud [--project=<project>] [--region=<region>] [--vm=<vm>] [--disk=<disk>] [--key=<key>] [--image=<image>]
  config aks [--project=<project>] [--name=<name>] [--region=<region>] [--count=<count>]  [--vm=<vm>] [--disk=<disk>] [--key=<key>]
  config externalregistry [--regurl=<regurl>] [--reguser=<reguser>] [--regpassword=<regpassword>]
  config registry [--disk=<disk>] [--ingress] 
  config (status|export|reset)
  config use [<n>] [--delete] [--rename=<rename>]
  config minimal
  config slim  
```

## Commands

```
  config apihost          configure the apihost (auto: auto assign) and enable tls
  config runtime          show the current runtime.json or import the <runtime-json> if provided
  config enable           enable OpenServerless services to install
  config disable          disable OpenServerless services to install
  config slack            configure Alert Manager over a given slack channel
  config mail             configure Alert Manager over a gmail account
  config volumes          configure the volume size distinguished in 3 categories (openwhisk couchdb & kafka, database, minio storage, alerting, milvus)
  config controller       configure Openwhisk enterprise controller java options
  config ingress          configure OpenServerless ingress class
  config invoker          configure Openwhisk enterprise invoker options
  config limits           configure Openwhisk actions limits
  config storage          allows to customize storage persistence class and provider
  config postgres         allows to customize enterprise options for nuvolaris default postgres deployment  
  config minio            allows to customize MINIO options
  config milvus           allows to customize MILVUS options
  config etcd             allows to customize ETCD options
  config aws              configure Amazon Web Service (AWS) credentials and parameters
  config gcloud           configure Google Cloud credentials and parameters
  config eks              configure Amazon EKS Kubernetes Cluster
  config azcloud          configure Azure VM credentials and parameters
  config aks              configure Azure AKS Kubernetes Cluster
  config gke              configure Google Cloud GKE Kubernetes Cluster
  config reset            reset configuration
  config status           show current configuration
  config export           export all the variables
  config use              use a different kubernetes cluster among those you created
  config minimal          shortcut for ops config enabling only redis,mongodb,minio,cron,static,postgres
  config slim             shortcut for ops config slim, but adding lightweight milvus and other sizing improvements
  config registry         configure the internal image registry for actions runtimes
  config externalregistry configure an external private image registry for action runtimes
```

## Options

```
  --all                 select all services
  --redis               select redis
  --mongodb             select mongodb (FerretDB Proxy)
  --minio               select minio
  --cron                select cron
  --static              select static
  --postgres            select postgres
  --tls=<email>         enable tls with let's encrypt, contact email required
  --access=<access>     specify access key
  --secret=<secret>     specify secret key  
  --name=<name>         specify name
  --region=<region>     specify region (AWS) location (Azure) or zone (GKE)
  --count=<count>       specify node count
  --vm=<vm>             specify vm type
  --disk=<disk>         specify disk size
  --key=<key>           specify ssh key name
  --kubever=<kubever>   specify kubernetes version
  --delete              delete the selected kubeconfig
  --image=<image>       specify gcp image type (default to ubuntu-minimal-2204-lts. Passing ubuntu-minimal-2204-lts-arm64 will create ARM based VM)
  --prometheus          select monitoring via Prometheus
  --slack               select alert manager module over Slack channel
  --mail                select alert manager module over mail channel using a gmail account
  --affinity            select pod affinity for multinode enterprise deployment. In such case load will be splitted between node labeled with nuvolaris-role in core or invoker
  --tolerations         select pod tolerations for multinode enterprise deployment.
  --failover            select failover support on components supporting it as postgres
  --backup              select automatic backup on components support it as postgres
  --s3                  activate s3 compatible ingress on components supporting it
  --console             activate a s3 console ingress on components supporting it (Currently MINIO)
  --quota               select quota checker module
  --milvus              select MILVUS vector database
  --registry            activate the support for a private image registry for custom actions (by default it will install one)
  --class               specify the ingress class. It can be auto, traefik, nginx. On microk8s it should be public.
```
