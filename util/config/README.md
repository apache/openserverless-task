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
