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
