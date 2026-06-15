# How does the old ops task file work? - Output Variables

Task file: https://github.com/apache/openserverless-task/blob/eee896f2c11b8ca114ec39a83df0c8acfccb332c/config/opsfile.yml

Output variables are keys written via `config KEY=value` calls inside tasks.

## Output variables

| Variable                                    | Type   | Tasks                                  |
|---------------------------------------------|--------|----------------------------------------|
| `AKS_COUNT`                                 | Output | `aks`                                  |
| `AKS_DISK`                                  | Output | `aks`                                  |
| `AKS_NAME`                                  | Output | `aks`                                  |
| `AKS_PROJECT`                               | Output | `aks`                                  |
| `AKS_REGION`                                | Output | `aks`                                  |
| `AKS_SSHKEY`                                | Output | `aks`                                  |
| `AKS_VM`                                    | Output | `aks`                                  |
| `AWS_ACCESS_KEY_ID`                         | Output | `_aws`                                 |
| `AWS_DEFAULT_REGION`                        | Output | `_aws`                                 |
| `AWS_SECRET_ACCESS_KEY`                     | Output | `_aws`                                 |
| `AWS_SSHKEY`                                | Output | `_aws`                                 |
| `AWS_VM_DISK_SIZE`                          | Output | `aws`                                  |
| `AWS_VM_IMAGE_ID`                           | Output | `aws`                                  |
| `AWS_VM_IMAGE_USER`                         | Output | `aws`                                  |
| `AWS_VM_INSTANCE_TYPE`                      | Output | `aws`                                  |
| `AZCLOUD_DISK`                              | Output | `azcloud`                              |
| `AZCLOUD_IMAGE`                             | Output | `azcloud`                              |
| `AZCLOUD_PROJECT`                           | Output | `azcloud`                              |
| `AZCLOUD_REGION`                            | Output | `azcloud`                              |
| `AZCLOUD_SSHKEY`                            | Output | `azcloud`                              |
| `AZCLOUD_VM`                                | Output | `azcloud`                              |
| `CONFIGURED`                                | Output | `enable`, `minimal`, `slim`            |
| `ETCD_AUTO_COMPACTION_RETENTION`            | Output | `etcd`                                 |
| `ETCD_CONFIG_REPLICAS`                      | Output | `etcd`, `slim`                         |
| `ETCD_QUOTA_BACKEND_BYTES`                  | Output | `etcd`                                 |
| `EKS_COUNT`                                 | Output | `eks`                                  |
| `EKS_DISK`                                  | Output | `eks`                                  |
| `EKS_KUBERNETES_VERSION`                    | Output | `eks`                                  |
| `EKS_NAME`                                  | Output | `eks`                                  |
| `EKS_REGION`                                | Output | `eks`                                  |
| `EKS_VM`                                    | Output | `eks`                                  |
| `GCLOUD_DISK`                               | Output | `gcloud`                               |
| `GCLOUD_IMAGE`                              | Output | `gcloud`                               |
| `GCLOUD_PROJECT`                            | Output | `gcloud`                               |
| `GCLOUD_REGION`                             | Output | `gcloud`                               |
| `GCLOUD_SSHKEY`                             | Output | `gcloud`                               |
| `GCLOUD_VM`                                 | Output | `gcloud`                               |
| `GKE_COUNT`                                 | Output | `gke`                                  |
| `GKE_DISK`                                  | Output | `gke`                                  |
| `GKE_NAME`                                  | Output | `gke`                                  |
| `GKE_PROJECT`                               | Output | `gke`                                  |
| `GKE_REGION`                                | Output | `gke`                                  |
| `GKE_VM`                                    | Output | `gke`                                  |
| `MINIO_CONFIG_INGRESS_CONSOLE`              | Output | `minio`                                |
| `MINIO_CONFIG_INGRESS_S3`                   | Output | `minio`                                |
| `OPENWHISK_ACTION_INVOKE_CONCURRENT`        | Output | `limits`                               |
| `OPENWHISK_ACTION_INVOKE_PER_MINUTE`        | Output | `limits`                               |
| `OPENWHISK_ACTION_MEMORY_LIMIT_MAX`         | Output | `limits`                               |
| `OPENWHISK_ACTION_SEQUENCE_MAX_LENGTH`      | Output | `limits`                               |
| `OPENWHISK_ACTIVATION_MAX_ALLOWED_PAYLOAD`  | Output | `limits`                               |
| `OPENWHISK_CONTROLLER_JVMGB`                | Output | `controller`                           |
| `OPENWHISK_CONTROLLER_LOGGINGLEVEL`         | Output | `controller`                           |
| `OPENWHISK_CONTROLLER_REPLICAS`             | Output | `controller`                           |
| `OPENWHISK_INVOKER_CONTAINER_POOL_MEMORY`   | Output | `slim`                                 |
| `OPENWHISK_INVOKER_CONTAINER_POOLMEMORYGB`  | Output | `invoker`                              |
| `OPENWHISK_INVOKER_JVMGB`                   | Output | `invoker`                              |
| `OPENWHISK_INVOKER_KUBERNETES_TIMEOUT_LOGS` | Output | `invoker`                              |
| `OPENWHISK_INVOKER_KUBERNETES_TIMEOUT_RUN`  | Output | `invoker`                              |
| `OPENWHISK_INVOKER_LOGGINGLEVEL`            | Output | `invoker`                              |
| `OPENWHISK_INVOKER_REPLICAS`                | Output | `invoker`                              |
| `OPENWHISK_LB_BLACKBOX_FRACTION`            | Output | `limits`                               |
| `OPENWHISK_TIME_LIMIT_MAX`                  | Output | `limits`, `slim`                       |
| `OPENWHISK_TRIGGER_PER_MINUTE`              | Output | `limits`                               |
| `OPERATOR_COMPONENT_AM`                     | Output | `enable`, `disable`                    |
| `OPERATOR_COMPONENT_CRON`                   | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_ETCD`                   | Output | `enable`, `disable`, `slim`            |
| `OPERATOR_COMPONENT_INVOKER`                | Output | `slim`                                 |
| `OPERATOR_COMPONENT_KAFKA`                  | Output | `slim`                                 |
| `OPERATOR_COMPONENT_MILVUS`                 | Output | `enable`, `disable`, `slim`            |
| `OPERATOR_COMPONENT_MINIO`                  | Output | `enable`, `disable`, `slim`            |
| `OPERATOR_COMPONENT_MONGODB`                | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_POSTGRES`               | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_PROMETHEUS`             | Output | `enable`, `disable`                    |
| `OPERATOR_COMPONENT_QUOTA`                  | Output | `enable`, `disable`                    |
| `OPERATOR_COMPONENT_REDIS`                  | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_REGISTRY`               | Output | `enable`, `disable`, `slim`            |
| `OPERATOR_COMPONENT_SEAWEEDFS`              | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_STATIC`                 | Output | `enable`, `disable`, `minimal`, `slim` |
| `OPERATOR_COMPONENT_TLS`                    | Output | `apihost`                              |
| `OPERATOR_COMPONENT_ZOOKEEPER`              | Output | `slim`                                 |
| `OPERATOR_CONFIG_AFFINITY`                  | Output | `enable`, `disable`                    |
| `OPERATOR_CONFIG_ALERTGMAIL`                | Output | `enable`, `disable`                    |
| `OPERATOR_CONFIG_ALERTSLACK`                | Output | `enable`, `disable`                    |
| `OPERATOR_CONFIG_APIHOST`                   | Output | `apihost`                              |
| `OPERATOR_CONFIG_EMAIL_FROM`                | Output | `mail`                                 |
| `OPERATOR_CONFIG_EMAIL_TO`                  | Output | `mail`                                 |
| `OPERATOR_CONFIG_GMAIL_PASSWORD`            | Output | `mail`                                 |
| `OPERATOR_CONFIG_GMAIL_USERNAME`            | Output | `mail`                                 |
| `OPERATOR_CONFIG_HOSTPROTOCOL`              | Output | `apihost`                              |
| `OPERATOR_CONFIG_INGRESSCLASS`              | Output | `ingress`                              |
| `OPERATOR_CONFIG_SLACK_APIURL`              | Output | `slack`                                |
| `OPERATOR_CONFIG_SLACK_CHANNELNAME`         | Output | `slack`                                |
| `OPERATOR_CONFIG_SLIM`                      | Output | `slim`                                 |
| `OPERATOR_CONFIG_STORAGECLASS`              | Output | `storage`                              |
| `OPERATOR_CONFIG_STORAGEPROVISIONER`        | Output | `storage`                              |
| `OPERATOR_CONFIG_TLSEMAIL`                  | Output | `apihost`                              |
| `OPERATOR_CONFIG_TOLERATIONS`               | Output | `enable`, `disable`                    |
| `POSTGRES_CONFIG_BACKUP_ENABLED`            | Output | `postgres`                             |
| `POSTGRES_CONFIG_BACKUP_SCHEDULE`           | Output | `postgres`                             |
| `POSTGRES_CONFIG_FAILOVER`                  | Output | `postgres`                             |
| `POSTGRES_CONFIG_REPLICAS`                  | Output | `postgres`, `slim`                     |
| `REGISTRY_CONFIG_HOSTNAME`                  | Output | `externalregistry`                     |
| `REGISTRY_CONFIG_INGRESS_ENABLED`           | Output | `registry`                             |
| `REGISTRY_CONFIG_MODE`                      | Output | `externalregistry`, `registry`         |
| `REGISTRY_CONFIG_SECRET_PUSH_PULL`          | Output | `enable`, `externalregistry`, `slim`   |
| `REGISTRY_CONFIG_USERNAME`                  | Output | `externalregistry`                     |
| `REGISTRY_CONFIG_VOLUME_SIZE`               | Output | `registry`                             |
| `ROOTCOORD_MILVUS_DATABASE_NUM`             | Output | `milvus`                               |
| `SEAWEEDFS_CONFIG_INGRESS_CONSOLE_ENABLED`  | Output | `seaweefs`                             |
| `SEAWEEDFS_CONFIG_INGRESS_S3_ENABLED`       | Output | `seaweefs`, `slim`                     |
| `STORAGE_SIZE_COUCHDB`                      | Output | `volumes`                              |
| `STORAGE_SIZE_ETCD`                         | Output | `volumes`                              |
| `STORAGE_SIZE_KAFKA`                        | Output | `volumes`                              |
| `STORAGE_SIZE_MILVUS_CLUSTER`               | Output | `volumes`                              |
| `STORAGE_SIZE_MILVUS_PULSAR_JOURNAL`        | Output | `volumes`                              |
| `STORAGE_SIZE_MILVUS_PULSAR_LEDGERS`        | Output | `volumes`                              |
| `STORAGE_SIZE_MILVUS_ZOOKEEPER`             | Output | `volumes`                              |
| `STORAGE_SIZE_MINIO`                        | Output | `volumes`                              |
| `STORAGE_SIZE_MONGODB`                      | Output | `volumes`                              |
| `STORAGE_SIZE_MONITORING`                   | Output | `volumes`                              |
| `STORAGE_SIZE_POSTGRES`                     | Output | `volumes`                              |
| `STORAGE_SIZE_REDIS`                        | Output | `volumes`                              |
| `STORAGE_SIZE_SEAWEEDFS`                    | Output | `volumes`                              |
| `STORAGE_SIZE_ZOOKEEPER`                    | Output | `volumes`                              |
