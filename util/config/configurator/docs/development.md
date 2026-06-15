# Development setup

All configurator source code lives inside the `configurator/` folder.
The entry point is `configurator/index.ts`, which calls the main function in
`configurator/configurator.ts`.

## Class diagram
[configurator-class-diagram.mmd](configurator-class-diagram.mmd)


From the project root, enter the configurator directory and install dependencies:

```bash
cd util/config/configurator
bun install
```

---

## Available commands

All commands must be run from inside `util/config/configurator/`.

### `bun run start`

Launches the interactive configurator against the master config file
(`all-config-parameters.toml`). Use arrow keys to navigate components and
parameters, `ENTER` to confirm, `ESC` or `Ctrl+C` to cancel an edit or exit.

```bash
bun run start
```

### `bun run startdebug`

Same as `start`, but waits for a debugger to attach before executing.
Useful with the VSCode "Attach Bun" launch configuration in `.vscode/launch.json`.

```bash
bun run startdebug
```

### `bun run test`

Runs the unit test suite with Bun's built-in test runner.

```bash
bun run test
```

To run the full test suite (all test files, not only `index.test.ts`):

```bash
bun test tests/
```

### `bun run build`

Bundles the configurator into a single JavaScript file and places it one level
up as `util/config/configurator.js`, which is the file consumed by the `ops`
task runner.

```bash
bun run build
```

Run this after every change before committing, so the bundled file stays in sync
with the source.

---