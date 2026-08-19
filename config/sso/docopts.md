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

# Tasks `ops config sso`

Configure OpenServerless SSO/OIDC integration for admin-api.

## Synopsis

```text
Usage:
  sso keycloak --enable --issuer-url=<issuer-url> --jwks-url=<jwks-url> (--audience=<audience>|--client-id=<client-id>) --required-group=<group> [--client-secret=<client-secret>] [--username-claim=<claim>] [--groups-claim=<claim>] [--namespace=<namespace>] [--configmap=<name>] [--secret=<name>] [--statefulset=<name>] [--container=<name>] [--no-rollout]
  sso show
  sso disable [--namespace=<namespace>] [--configmap=<name>] [--secret=<name>] [--statefulset=<name>] [--container=<name>] [--no-rollout]
```

## Managed resources

The task owns a dedicated ConfigMap, named
`openserverless-sso-config` by default, with these keys:

- `OIDC_ISSUER_URL`
- `OIDC_JWKS_URL`
- `OIDC_AUDIENCE`
- `OIDC_CLIENT_ID`
- `OIDC_REQUIRED_GROUP`
- `OIDC_USERNAME_CLAIM`
- `OIDC_GROUPS_CLAIM`
- `SSO_AUTOPROVISION_ON_LOGIN`
- `SSO_AUTOPROVISION_TIMEOUT_SECONDS`
- `SSO_AUTOPROVISION_POLL_SECONDS`
- `SSO_AUTOPROVISION_DEFAULT_SERVICES`
- `SSO_NAMESPACE_PRESERVE_VALID`
- `SSO_NAMESPACE_HASH_LENGTH`
- `SSO_NAMESPACE_MAX_LENGTH`

With `--client-secret`, the task also owns a dedicated Secret, named
`openserverless-sso-secret` by default, containing only
`OIDC_CLIENT_SECRET`.

The selected admin-api container receives exact, prefix-free `envFrom`
references to those resources. The task does not manage direct `env` entries,
other `envFrom` references, volumes, volume mounts, or annotations.

`disable` removes only the managed references and dedicated resources. Missing
resources are not errors. Repeated disable is a no-op for the StatefulSet.
Kubernetes automatically rolls out a changed pod template; `--no-rollout`
skips waiting for it and never issues an additional restart.

## Options

```text
  --username-claim=<claim>      OIDC username claim [default: preferred_username]
  --groups-claim=<claim>        OIDC groups claim [default: groups]
  --client-id=<client-id>       OIDC client id; defaults to audience
  --client-secret=<secret>      confidential client secret stored only in Kubernetes
  --namespace=<namespace>       Kubernetes namespace [default: nuvolaris]
  --configmap=<name>            ConfigMap name [default: openserverless-sso-config]
  --secret=<name>               Secret name [default: openserverless-sso-secret]
  --statefulset=<name>          admin-api StatefulSet [default: nuvolaris-system-api]
  --container=<name>            admin-api container [default: nuvolaris-system-api]
  --no-rollout                  do not restart or wait for admin-api rollout
```
