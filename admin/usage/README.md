<!--
  ~ Licensed to the Apache Software Foundation (ASF) under one
  ~ or more contributor license agreements.  See the NOTICE file
  ~ distributed with this work for additional information
  ~ regarding copyright ownership.  The ASF licenses this file
  ~ to you under the Apache License, Version 2.0 (the
  ~ "License"); you may not use this file except in compliance
  ~ with the License.  You may obtain a copy of the License at
  ~
  ~   http://www.apache.org/licenses/LICENSE-2.0
  ~
  ~ Unless required by applicable law or agreed to in writing,
  ~ software distributed under the License is distributed on an
  ~ "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  ~ KIND, either express or implied.  See the License for the
  ~ specific language governing permissions and limitations
  ~ under the License.
-->

## Openserverless Usage task

### Development:

The `usage` implementation is inside the `usagechecker` folder.
The entrypoint is the `usagechecker/index.ts` file.

#### Components:

1. `volume-manager`: Reads the [yaml template](./usage-job.tpl.yaml) file, injects PVC and volume configurations, and
   renders the final template
2. `log-formatter`: Processes raw PVC/log data and generates formatted disk usage (df) output
3. `job-operator`: Orchestrates the entire workflow including template rendering, job creation, and Kubernetes deployment

##### Fetch dependencies
```bash
bun install
```

#### Execute tests

There are component's tests inside the `usagechecker/tests` folder.

```bash
bun run test
```

### Building:

To build the configurator and generate the `usage.js` file, run the following command:

```bash
bun run build
```

It will generate the `usage.js` file and move it in the parent, where it can be used by the opsfile task.
