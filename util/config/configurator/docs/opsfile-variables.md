# How the ops config opsfile works

Please note that this document is about the *old* configurator, and that it's saved here to keep it
along with the new configurator.
`task` is a tool used to run the `opsfile.yml`. 

**Source:** [`config/opsfile.yml`](https://github.com/apache/openserverless-task/blob/eee896f2c11b8ca114ec39a83df0c8acfccb332c/config/opsfile.yml)

The config opsfile is the configuration file for the original sequential configurator.
Each task prompts the user for values and writes them to the `ops` key-value store via
`config KEY=value` calls. The configuration file of the new interactive configurator
(`all-config-parameters.toml`) replaces this workflow, but the output keys remain the same.

Complete variable lists: [inputs](opsfile-variables-input.md) · [outputs](opsfile-variables-output.md)

---

## Variable naming conventions

### Input variables (`__` prefix)

All CLI flags supplied by the user at invocation time use the `__` double-underscore
prefix. They are **read-only**: the opsfile never writes to them, it only reads them.

```
ops config aws --vm=t3a.large --disk=100
               ↑              ↑
            __vm            __disk   (read inside the task, never stored)
```

### Output variables (uppercase)

Output variables are keys written to the `ops` store via `config KEY=value`.
They follow a hierarchical naming convention:

| Pattern                | Meaning                                                                     |
|------------------------|-----------------------------------------------------------------------------|
| `CLOUD_*`              | Cloud provider credentials and VM settings (e.g. `AWS_`, `GCLOUD_`, `AKS_`) |
| `OPERATOR_COMPONENT_*` | Boolean toggle for a deployable service component                           |
| `OPERATOR_CONFIG_*`    | Scalar operator configuration (host, ingress class, alert targets, …)       |
| `OPENWHISK_*`          | OpenWhisk runtime limits and tuning                                         |
| `STORAGE_SIZE_*`       | PVC sizes (in gigabytes) for each component                                 |
| `POSTGRES_CONFIG_*`    | Postgres HA and backup settings                                             |
| `REGISTRY_CONFIG_*`    | Container image registry settings                                           |
| `ETCD_*`               | ETCD cluster settings                                                       |

---

## Helper primitives

Two internal tasks handle all interactive prompting. They are never called directly.

### `read` - prompt with default

Prompts the user and falls back to a default when the input is blank.
Used for optional or tuneable parameters.

```yaml
task: read
vars:
  VAR:  STORAGE_SIZE_REDIS   # key written to ops store
  MSG:  "Redis volume size"  # prompt text
  VAL:  "{{.__redisvol}}"    # CLI flag value (may be empty)
  DEF:  "25"                 # default used when VAL and current value are empty
  HINT: "..."                # optional extra guidance shown before the prompt
```

### `readforce` - prompt without default

Same as `read` but **loops until a non-empty value is provided**.
Used for mandatory fields like credentials and project IDs.

---

## Task reference

Tasks are grouped below by what they configure. For each task the table shows
the CLI flag it reads and the config key it writes.

### Cloud provider - `_aws` (credentials shared by `aws` and `eks`)

```bash
ops config _aws [--access=…] [--secret=…] [--region=…] [--key=…]
```

| Input flag   | Output key              | Default              |
|--------------|-------------------------|----------------------|
| `--access`   | `AWS_ACCESS_KEY_ID`     | *(mandatory)*        |
| `--secret`   | `AWS_SECRET_ACCESS_KEY` | *(mandatory)*        |
| `--region`   | `AWS_DEFAULT_REGION`    | `us-east-1`          |
| `--key`      | `AWS_SSHKEY`            | `openserverless-key` |

---

### Cloud provider - `aws` (VM infrastructure on AWS)

```bash
ops config aws [--image=…] [--vmuser=…] [--vm=…] [--disk=…]
```

Calls `_aws` first, then adds:

| Input flag  | Output key             | Default                 |
|-------------|------------------------|-------------------------|
| `--image`   | `AWS_VM_IMAGE_ID`      | `ami-052efd3df9dad4825` |
| `--vmuser`  | `AWS_VM_IMAGE_USER`    | `ubuntu`                |
| `--vm`      | `AWS_VM_INSTANCE_TYPE` | `t3a.large`             |
| `--disk`    | `AWS_VM_DISK_SIZE`     | `100`                   |

---

### Cloud provider - `eks` (Amazon EKS cluster)

```bash
ops config eks [--name=…] [--region=…] [--count=…] [--vm=…] [--disk=…] [--kubever=…]
```

Calls `_aws` first, then adds:

| Input flag  | Output key               | Default          |
|-------------|--------------------------|------------------|
| `--name`    | `EKS_NAME`               | `openserverless` |
| `--region`  | `EKS_REGION`             | `us-east-2`      |
| `--count`   | `EKS_COUNT`              | `3`              |
| `--vm`      | `EKS_VM`                 | `m5.xlarge`      |
| `--disk`    | `EKS_DISK`               | `50`             |
| `--kubever` | `EKS_KUBERNETES_VERSION` | `1.25`           |

---

### Cloud provider - `gcloud` (Google Cloud VM infrastructure)

```bash
ops config gcloud [--project=…] [--region=…] [--vm=…] [--disk=…] [--key=…] [--image=…]
```

| Input flag   | Output key       | Default |
|--------------|------------------|---|
| `--project`  | `GCLOUD_PROJECT` | *(mandatory)* |
| `--region`   | `GCLOUD_REGION`  | `us-east1` |
| `--vm`       | `GCLOUD_VM`      | `n2-standard-4` |
| `--disk`     | `GCLOUD_DISK`    | `200` |
| `--key`      | `GCLOUD_SSHKEY`  | `~/.ssh/id_rsa.pub` |
| `--image`    | `GCLOUD_IMAGE`   | `ubuntu-minimal-2204-lts` |

---

### Cloud provider - `gke` (Google Kubernetes Engine)

```bash
ops config gke [--project=…] [--name=…] [--region=…] [--count=…] [--vm=…] [--disk=…]
```

| Input flag   | Output key    | Default         |
|--------------|---------------|-----------------|
| `--project`  | `GKE_PROJECT` | *(mandatory)*   |
| `--name`     | `GKE_NAME`    | `nuvolaris`     |
| `--region`   | `GKE_REGION`  | `us-east1`      |
| `--count`    | `GKE_COUNT`   | `3`             |
| `--vm`       | `GKE_VM`      | `e2-standard-2` |
| `--disk`     | `GKE_DISK`    | `50`            |

---

### Cloud provider - `azcloud` (Azure VM infrastructure)

```bash
ops config azcloud [--project=…] [--region=…] [--vm=…] [--disk=…] [--key=…] [--image=…]
```

| Input flag  | Output key        | Default             |
|-------------|-------------------|---------------------|
| `--project` | `AZCLOUD_PROJECT` | *(mandatory)*       |
| `--region`  | `AZCLOUD_REGION`  | `eastus`            |
| `--vm`      | `AZCLOUD_VM`      | `Standard_B4s_v2`   |
| `--disk`    | `AZCLOUD_DISK`    | `100`               |
| `--key`     | `AZCLOUD_SSHKEY`  | `~/.ssh/id_rsa.pub` |
| `--image`   | `AZCLOUD_IMAGE`   | `Ubuntu2204`        |

---

### Cloud provider - `aks` (Azure Kubernetes Service)

```bash
ops config aks [--project=…] [--name=…] [--count=…] [--region=…] [--vm=…] [--disk=…] [--key=…]
```

| Input flag   | Output key    | Default             |
|--------------|---------------|---------------------|
| `--project`  | `AKS_PROJECT` | `openserverless`    |
| `--name`     | `AKS_NAME`    | `openserverless`    |
| `--count`    | `AKS_COUNT`   | `3`                 |
| `--region`   | `AKS_REGION`  | `eastus`            |
| `--vm`       | `AKS_VM`      | `Standard_B4ms`     |
| `--disk`     | `AKS_DISK`    | `50`                |
| `--key`      | `AKS_SSHKEY`  | `~/.ssh/id_rsa.pub` |

---

### Component toggles - `enable` / `disable`

```bash
ops config enable  [--redis] [--mongodb] [--minio] [--cron] [--static] [--postgres]
                   [--prometheus] [--slack] [--mail] [--affinity] [--tolerations]
                   [--quota] [--milvus] [--registry] [--seaweedfs] [--etcd] [--all]
ops config disable [same flags]
```

Each flag sets the corresponding output key to `true` (enable) or `false` (disable).

| Flag            | Output key                           | Cascade                                                  |
|-----------------|--------------------------------------|----------------------------------------------------------|
| `--redis`       | `OPERATOR_COMPONENT_REDIS`           | -                                                        |
| `--mongodb`     | `OPERATOR_COMPONENT_MONGODB`         | also enables `POSTGRES`                                  |
| `--minio`       | `OPERATOR_COMPONENT_MINIO`           | -                                                        |
| `--cron`        | `OPERATOR_COMPONENT_CRON`            | -                                                        |
| `--static`      | `OPERATOR_COMPONENT_STATIC`          | -                                                        |
| `--postgres`    | `OPERATOR_COMPONENT_POSTGRES`        | disabling also disables `MONGODB`                        |
| `--prometheus`  | `OPERATOR_COMPONENT_PROMETHEUS`      | disabling also disables `AM`, `ALERTGMAIL`, `ALERTSLACK` |
| `--slack`       | `OPERATOR_CONFIG_ALERTSLACK`         | also enables `PROMETHEUS` + `AM`                         |
| `--mail`        | `OPERATOR_CONFIG_ALERTGMAIL`         | also enables `PROMETHEUS` + `AM`                         |
| `--affinity`    | `OPERATOR_CONFIG_AFFINITY`           | -                                                        |
| `--tolerations` | `OPERATOR_CONFIG_TOLERATIONS`        | -                                                        |
| `--quota`       | `OPERATOR_COMPONENT_QUOTA`           | -                                                        |
| `--milvus`      | `OPERATOR_COMPONENT_MILVUS` + `ETCD` | also enables `MINIO`                                     |
| `--registry`    | `OPERATOR_COMPONENT_REGISTRY`        | generates `REGISTRY_CONFIG_SECRET_PUSH_PULL`             |
| `--seaweedfs`   | `OPERATOR_COMPONENT_SEAWEEDFS`       | -                                                        |
| `--all`         | all of the above                     | -                                                        |

Both tasks also set `CONFIGURED=true` when done.

---

### API host - `apihost`

```bash
ops config apihost [--tls=<email>] [--protocol=<http|https|auto>]
```

| Input flag    | Output key                                                 | Default                           |
|---------------|------------------------------------------------------------|-----------------------------------|
| *(positional)* | `OPERATOR_CONFIG_APIHOST`                                  | *(set externally as `_apihost_`)* |
| `--tls`       | `OPERATOR_CONFIG_TLSEMAIL` + `OPERATOR_COMPONENT_TLS=true` | `none` / `false`                  |
| `--protocol`  | `OPERATOR_CONFIG_HOSTPROTOCOL`                             | `auto`                            |

---

### Alerting - `slack`

```bash
ops config slack --apiurl=<url> [--channel=<name>]
```

| Input flag   | Output key                          | Default                      |
|--------------|-------------------------------------|------------------------------|
| `--apiurl`   | `OPERATOR_CONFIG_SLACK_APIURL`      | *(mandatory)*                |
| `--channel`  | `OPERATOR_CONFIG_SLACK_CHANNELNAME` | `#monitoring-openserverless` |

---

### Alerting - `mail`

```bash
ops config mail --mailuser=<user> --mailpwd=<pwd> [--mailfrom=<addr>] [--mailto=<addr>]
```

| Input flag   | Output key                       | Default                 |
|--------------|----------------------------------|-------------------------|
| `--mailuser` | `OPERATOR_CONFIG_GMAIL_USERNAME` | *(mandatory)*           |
| `--mailpwd`  | `OPERATOR_CONFIG_GMAIL_PASSWORD` | *(mandatory)*           |
| `--mailfrom` | `OPERATOR_CONFIG_EMAIL_FROM`     | `msciabarra@apache.org` |
| `--mailto`   | `OPERATOR_CONFIG_EMAIL_TO`       | `nomail@mail.com`       |

---

### Storage volumes - `volumes`

```bash
ops config volumes [--couchdb=…] [--kafka=…] [--redisvol=…] [--mongodbvol=…]
                   [--pgvol=…] [--storage=…] [--alerting=…] [--zookeeper=…]
                   [--mvzookvol=…] [--mvvol=…] [--pulsarjournalvol=…]
                   [--pulsarledgelvol=…] [--seaweedfsvol=…]
```

All values are storage sizes in gigabytes.

| Input flag           | Output key                           | Default |
|----------------------|--------------------------------------|---------|
| `--couchdb`          | `STORAGE_SIZE_COUCHDB`               | `30`    |
| `--kafka`            | `STORAGE_SIZE_KAFKA`                 | `30`    |
| `--redisvol`         | `STORAGE_SIZE_REDIS`                 | `25`    |
| `--mongodbvol`       | `STORAGE_SIZE_MONGODB`               | `50`    |
| `--pgvol`            | `STORAGE_SIZE_POSTGRES`              | `50`    |
| `--storage`          | `STORAGE_SIZE_MINIO`                 | `50`    |
| `--alerting`         | `STORAGE_SIZE_MONITORING`            | `30`    |
| `--zookeeper`        | `STORAGE_SIZE_ZOOKEEPER`             | `5`     |
| `--mvzookvol`        | `STORAGE_SIZE_ETCD`                  | `25`    |
| `--mvvol`            | `STORAGE_SIZE_MILVUS_CLUSTER`        | `20`    |
| `--mvzookvol`        | `STORAGE_SIZE_MILVUS_ZOOKEEPER`      | `10`    |
| `--pulsarjournalvol` | `STORAGE_SIZE_MILVUS_PULSAR_JOURNAL` | `25`    |
| `--pulsarledgelvol`  | `STORAGE_SIZE_MILVUS_PULSAR_LEDGERS` | `20`    |
| `--seaweedfsvol`     | `STORAGE_SIZE_SEAWEEDFS`             | `60`    |

---

### OpenWhisk controller - `controller`

```bash
ops config controller [--javaopts=…] [--loglevel=…] [--replicas=…]
```

| Input flag   | Output key                          | Default |
|--------------|-------------------------------------|---------|
| `--javaopts` | `OPENWHISK_CONTROLLER_JVMGB`        | `2`     |
| `--loglevel` | `OPENWHISK_CONTROLLER_LOGGINGLEVEL` | `INFO`  |
| `--replicas` | `OPENWHISK_CONTROLLER_REPLICAS`     | `1`     |

---

### OpenWhisk invoker - `invoker`

```bash
ops config invoker [--javaopts=…] [--poolmemory=…] [--timeoutsrun=…]
                   [--timeoutslogs=…] [--loglevel=…] [--replicas=…]
```

| Input flag       | Output key                                  | Default |
|------------------|---------------------------------------------|---------|
| `--javaopts`     | `OPENWHISK_INVOKER_JVMGB`                   | `2`     |
| `--poolmemory`   | `OPENWHISK_INVOKER_CONTAINER_POOLMEMORYGB`  | `2`     |
| `--timeoutsrun`  | `OPENWHISK_INVOKER_KUBERNETES_TIMEOUT_RUN`  | `1`     |
| `--timeoutslogs` | `OPENWHISK_INVOKER_KUBERNETES_TIMEOUT_LOGS` | `1`     |
| `--loglevel`     | `OPENWHISK_INVOKER_LOGGINGLEVEL`            | `INFO`  |
| `--replicas`     | `OPENWHISK_INVOKER_REPLICAS`                | `1`     |

---

### OpenWhisk limits - `limits`

```bash
ops config limits [--time=…] [--memory=…] [--sequencelength=…] [--perminute=…]
                  [--concurrent=…] [--triggerperminute=…]
                  [--activation_max_payload=…] [--blackbox_fraction=…]
```

| Input flag                 | Output key                                 | Default   |
|----------------------------|--------------------------------------------|-----------|
| `--time`                   | `OPENWHISK_TIME_LIMIT_MAX`                 | `5min`    |
| `--memory`                 | `OPENWHISK_ACTION_MEMORY_LIMIT_MAX`        | `2048m`   |
| `--sequencelength`         | `OPENWHISK_ACTION_SEQUENCE_MAX_LENGTH`     | `50`      |
| `--perminute`              | `OPENWHISK_ACTION_INVOKE_PER_MINUTE`       | `999`     |
| `--concurrent`             | `OPENWHISK_ACTION_INVOKE_CONCURRENT`       | `250`     |
| `--triggerperminute`       | `OPENWHISK_TRIGGER_PER_MINUTE`             | `999`     |
| `--activation_max_payload` | `OPENWHISK_ACTIVATION_MAX_ALLOWED_PAYLOAD` | `1048576` |
| `--blackbox_fraction`      | `OPENWHISK_LB_BLACKBOX_FRACTION`           | `100%`    |

---

### Kubernetes storage class - `storage`

```bash
ops config storage [--class=…] [--provisioner=…]
```

| Input flag      | Output key                           | Default |
|-----------------|--------------------------------------|---------|
| `--class`       | `OPERATOR_CONFIG_STORAGECLASS`       | `auto`  |
| `--provisioner` | `OPERATOR_CONFIG_STORAGEPROVISIONER` | `auto`  |

---

### Ingress class - `ingress`

```bash
ops config ingress [--class=…]
```

| Input flag | Output key                     | Default |
|------------|--------------------------------|---------|
| `--class`  | `OPERATOR_CONFIG_INGRESSCLASS` | `auto`  |

---

### Postgres HA - `postgres`

```bash
ops config postgres [--backup] [--failover] [--schedule=…] [--replicas=…]
```

| Input flag   | Output key                            | Default       |
|--------------|---------------------------------------|---------------|
| `--backup`   | `POSTGRES_CONFIG_BACKUP_ENABLED=true` | -             |
| `--failover` | `POSTGRES_CONFIG_FAILOVER=true`       | -             |
| `--schedule` | `POSTGRES_CONFIG_BACKUP_SCHEDULE`     | `0 */1 * * *` |
| `--replicas` | `POSTGRES_CONFIG_REPLICAS`            | `2`           |

---

### MinIO ingress - `minio`

```bash
ops config minio [--s3] [--console]
```

| Input flag  | Output key                          |
|-------------|-------------------------------------|
| `--s3`      | `MINIO_CONFIG_INGRESS_S3=true`      |
| `--console` | `MINIO_CONFIG_INGRESS_CONSOLE=true` |

---

### ETCD - `etcd`

```bash
ops config etcd [--replicas=…] [--auto_compaction_retention=…] [--quota_backend_bytes=…]
```

| Input flag                    | Output key                       | Default      |
|-------------------------------|----------------------------------|--------------|
| `--replicas`                  | `ETCD_CONFIG_REPLICAS`           | `3`          |
| `--auto_compaction_retention` | `ETCD_AUTO_COMPACTION_RETENTION` | `1`          |
| `--quota_backend_bytes`       | `ETCD_QUOTA_BACKEND_BYTES`       | `2147483648` |

---

### Milvus - `milvus`

```bash
ops config milvus [--maxdbnum=…]
```

| Input flag   | Output key                      | Default |
|--------------|---------------------------------|---------|
| `--maxdbnum` | `ROOTCOORD_MILVUS_DATABASE_NUM` | `64`    |

---

### Container registry - `registry` (internal)

```bash
ops config registry [--ingress] [--disk=…]
```

| Input flag  | Output key                             | Default |
|-------------|----------------------------------------|---------|
| *(always)*  | `REGISTRY_CONFIG_MODE=internal`        | -       |
| `--ingress` | `REGISTRY_CONFIG_INGRESS_ENABLED=true` | -       |
| `--disk`    | `REGISTRY_CONFIG_VOLUME_SIZE`          | `50`    |

---

### Container registry - `externalregistry`

```bash
ops config externalregistry --regurl=<host> --reguser=<user> --regpassword=<pwd>
```

| Input flag      | Output key                         |
|-----------------|------------------------------------|
| *(always)*      | `REGISTRY_CONFIG_MODE=external`    |
| `--regurl`      | `REGISTRY_CONFIG_HOSTNAME`         |
| `--reguser`     | `REGISTRY_CONFIG_USERNAME`         |
| `--regpassword` | `REGISTRY_CONFIG_SECRET_PUSH_PULL` |

---

### SeaweedFS ingress - `seaweefs`

```bash
ops config seaweefs [--s3] [--console]
```

| Input flag  | Output key                                      |
|-------------|-------------------------------------------------|
| `--s3`      | `SEAWEEDFS_CONFIG_INGRESS_S3_ENABLED=true`      |
| `--console` | `SEAWEEDFS_CONFIG_INGRESS_CONSOLE_ENABLED=true` |

---

## Preset configurations

These tasks take no input flags and apply a fixed set of keys. They always call
`status` at the end and set `CONFIGURED=true`.

### `minimal`

Resets the config then enables the smallest viable deployment:

| Key                            | Value  |
|--------------------------------|--------|
| `OPERATOR_COMPONENT_REDIS`     | `true` |
| `OPERATOR_COMPONENT_MONGODB`   | `true` |
| `OPERATOR_COMPONENT_SEAWEEDFS` | `true` |
| `OPERATOR_COMPONENT_CRON`      | `true` |
| `OPERATOR_COMPONENT_STATIC`    | `true` |
| `OPERATOR_COMPONENT_POSTGRES`  | `true` |

### `slim`

Applies a tuned single-node profile (Milvus-capable, no Kafka/Zookeeper):

| Key                                       | Value                     |
|-------------------------------------------|---------------------------|
| `OPERATOR_COMPONENT_INVOKER`              | `false`                   |
| `OPERATOR_COMPONENT_ZOOKEEPER`            | `false`                   |
| `OPERATOR_COMPONENT_KAFKA`                | `false`                   |
| `OPERATOR_COMPONENT_MINIO`                | `false`                   |
| `OPERATOR_COMPONENT_REDIS`                | `true`                    |
| `OPERATOR_COMPONENT_MONGODB`              | `true`                    |
| `OPERATOR_COMPONENT_SEAWEEDFS`            | `true`                    |
| `OPERATOR_COMPONENT_CRON`                 | `true`                    |
| `OPERATOR_COMPONENT_STATIC`               | `true`                    |
| `OPERATOR_COMPONENT_POSTGRES`             | `true`                    |
| `OPERATOR_COMPONENT_ETCD`                 | `true`                    |
| `OPERATOR_COMPONENT_MILVUS`               | `true`                    |
| `OPERATOR_COMPONENT_REGISTRY`             | `true`                    |
| `SEAWEEDFS_CONFIG_INGRESS_S3_ENABLED`     | `true`                    |
| `ETCD_CONFIG_REPLICAS`                    | `1`                       |
| `POSTGRES_CONFIG_REPLICAS`                | `1`                       |
| `OPERATOR_CONFIG_SLIM`                    | `true`                    |
| `OPENWHISK_TIME_LIMIT_MAX`                | `10min`                   |
| `OPENWHISK_INVOKER_CONTAINER_POOL_MEMORY` | `6g`                      |
| `REGISTRY_CONFIG_SECRET_PUSH_PULL`        | *(random 12-char string)* |

---

## Utility tasks

| Task       | What it does                                                         |
|------------|----------------------------------------------------------------------|
| `status`   | Prints all `OPERATOR_`, `AKS_`, `EKS_`, `GKE_` keys currently stored |
| `export`   | Dumps config as `export KEY=value` shell lines + helper aliases      |
| `reset`    | Deletes `config.json` and `runtimes.json`, then dumps current config |
| `use`      | Lists or switches between stored kubeconfig files                    |
| `runtimes` | Displays or imports a custom `runtimes.json`                         |
