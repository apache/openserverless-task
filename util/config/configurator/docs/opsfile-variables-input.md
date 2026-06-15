# How does the old ops task file work?

Task file: https://github.com/apache/openserverless-task/blob/eee896f2c11b8ca114ec39a83df0c8acfccb332c/config/opsfile.yml

There are 70 input only variables.
In this task runner convention, __ prefix denotes CLI flags/arguments supplied by the user when invoking a task.
The outputs are the config KEY=value calls those flags drive - but the __ variables themselves are never written to, only read.

See the sections below.

## Input variables

All `__` variables are CLI flags/arguments supplied by the user when invoking a task (**Input** only).



| Variable                      | Type  | Tasks                                                                  |
|-------------------------------|-------|------------------------------------------------------------------------|
| `__access`                    | Input | `_aws`                                                                 |
| `__activation_max_payload`    | Input | `limits`                                                               |
| `__affinity`                  | Input | `enable`, `disable`                                                    |
| `__alerting`                  | Input | `volumes`                                                              |
| `__all`                       | Input | `enable`, `disable`                                                    |
| `__apiurl`                    | Input | `slack`                                                                |
| `__auto_compaction_retention` | Input | `etcd`                                                                 |
| `__backup`                    | Input | `postgres`                                                             |
| `__blackbox_fraction`         | Input | `limits`                                                               |
| `__channel`                   | Input | `slack`                                                                |
| `__class`                     | Input | `storage`, `ingress`                                                   |
| `__concurrent`                | Input | `limits`                                                               |
| `__console`                   | Input | `minio`, `seaweefs`                                                    |
| `__count`                     | Input | `eks`, `gke`, `aks`                                                    |
| `__couchdb`                   | Input | `volumes`                                                              |
| `__cron`                      | Input | `enable`, `disable`                                                    |
| `__delete`                    | Input | `use`                                                                  |
| `__disk`                      | Input | `aws`, `eks`, `gcloud`, `gke`, `azcloud`, `aks`, `registry`, `volumes` |
| `__etcd`                      | Input | `enable`, `disable`                                                    |
| `__failover`                  | Input | `postgres`                                                             |
| `__image`                     | Input | `aws`, `gcloud`, `azcloud`                                             |
| `__ingress`                   | Input | `registry`                                                             |
| `__javaopts`                  | Input | `controller`, `invoker`                                                |
| `__kafka`                     | Input | `volumes`                                                              |
| `__key`                       | Input | `_aws`, `gcloud`, `azcloud`, `aks`                                     |
| `__kubever`                   | Input | `eks`                                                                  |
| `__loglevel`                  | Input | `controller`, `invoker`                                                |
| `__mail`                      | Input | `enable`, `disable`                                                    |
| `__mailfrom`                  | Input | `mail`                                                                 |
| `__mailpwd`                   | Input | `mail`                                                                 |
| `__mailto`                    | Input | `mail`                                                                 |
| `__mailuser`                  | Input | `mail`                                                                 |
| `__maxdbnum`                  | Input | `milvus`                                                               |
| `__memory`                    | Input | `limits`                                                               |
| `__milvus`                    | Input | `enable`, `disable`                                                    |
| `__minio`                     | Input | `enable`, `disable`                                                    |
| `__mongodb`                   | Input | `enable`, `disable`                                                    |
| `__mongodbvol`                | Input | `volumes`                                                              |
| `__mvvol`                     | Input | `volumes`                                                              |
| `__mvzookvol`                 | Input | `volumes`                                                              |
| `__name`                      | Input | `eks`, `gke`, `aks`, `use`                                             |
| `__perminute`                 | Input | `limits`                                                               |
| `__pgvol`                     | Input | `volumes`                                                              |
| `__poolmemory`                | Input | `invoker`                                                              |
| `__postgres`                  | Input | `enable`, `disable`                                                    |
| `__project`                   | Input | `gcloud`, `gke`, `azcloud`, `aks`                                      |
| `__prometheus`                | Input | `enable`, `disable`                                                    |
| `__provisioner`               | Input | `storage`                                                              |
| `__protocol`                  | Input | `apihost`                                                              |
| `__pulsarjournalvol`          | Input | `volumes`                                                              |
| `__pulsarledgelvol`           | Input | `volumes`                                                              |
| `__quota`                     | Input | `enable`, `disable`                                                    |
| `__quota_backend_bytes`       | Input | `etcd`                                                                 |
| `__redis`                     | Input | `enable`, `disable`                                                    |
| `__redisvol`                  | Input | `volumes`                                                              |
| `__regpassword`               | Input | `externalregistry`                                                     |
| `__regurl`                    | Input | `externalregistry`                                                     |
| `__reguser`                   | Input | `externalregistry`                                                     |
| `__region`                    | Input | `_aws`, `eks`, `gcloud`, `gke`, `azcloud`, `aks`                       |
| `__registry`                  | Input | `enable`, `disable`                                                    |
| `__rename`                    | Input | `use`                                                                  |
| `__replicas`                  | Input | `controller`, `invoker`, `postgres`, `etcd`                            |
| `__s3`                        | Input | `minio`, `seaweefs`                                                    |
| `__schedule`                  | Input | `postgres`                                                             |
| `__seaweedfs`                 | Input | `enable`, `disable`                                                    |
| `__seaweedfsvol`              | Input | `volumes`                                                              |
| `__secret`                    | Input | `_aws`                                                                 |
| `__sequencelength`            | Input | `limits`                                                               |
| `__slack`                     | Input | `enable`, `disable`                                                    |
| `__static`                    | Input | `enable`, `disable`                                                    |
| `__storage`                   | Input | `volumes`                                                              |
| `__time`                      | Input | `limits`                                                               |
| `__timeoutslogs`              | Input | `invoker`                                                              |
| `__timeoutsrun`               | Input | `invoker`                                                              |
| `__tls`                       | Input | `apihost`                                                              |
| `__tolerations`               | Input | `enable`, `disable`                                                    |
| `__triggerperminute`          | Input | `limits`                                                               |
| `__vm`                        | Input | `aws`, `eks`, `gcloud`, `gke`, `azcloud`, `aks`                        |
| `__vmuser`                    | Input | `aws`                                                                  |
| `__zookeeper`                 | Input | `volumes`                                                              |

## Output variables

The outputs are the `config KEY=value` calls those flags drive.

