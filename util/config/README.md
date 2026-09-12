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

## Openserverless Configurator task

### Development:

The configurator is inside the `configurator` folder.
The entrypoint is the `configurator/index.ts` file. It simply calls the configurator main function.

All the logic is inside the `configurator/configurator.ts` file. Of course, you can add more files
and change the structure as you see fit.

Inside the `configurator` folder, first install dependencies:

```bash
bun install
```

In the `package.json` file there are a couple of scripts. The `start` script will run the configurator:

```bash
bun run start
```

### Tests:

There are unit tests inside the `configurator/test` folder. You can run them with the following command:

```bash
bun run test
```

### Building:

To build the configurator and generate the `configurator.js` file, run the following command:

```bash
bun run build
```

It will generate the `configurator.js` file and move it in the parent, where it can be used by the opsfile task.
