## OpenServerless Configurator

An interactive terminal tool for editing the parameters used by the `ops` CLI.
It groups parameters by cloud provider or service component, lets you navigate
with arrow keys, and auto-saves progress so you can resume after an interruption.

---

### How `ops` configuration works

The `ops` CLI stores key-value pairs that control the behaviour of deployments.

Display all current values:

```bash
ops -config -d
```

Set a single value:

```bash
ops -config KEY=value
```

Read a single value:

```bash
ops -config KEY
```

Remove a key:

```bash
ops -config -r KEY
```

The configurator is a friendlier front-end for these operations: it reads
`all-config-parameters.toml` to know which keys exist and what their labels and
defaults are, lets you edit them interactively, and then either calls
`ops -config KEY=value` for each change or saves the result to a timestamped
TOML file.

---

### Further reading

- `configurator/docs/user_manual.md` - full usage guide (navigation, exit options,
  resumability, TOML file format)
- `configurator/all-config-parameters.toml` - master list of all supported
  components and parameters
- `configurator/docs/development.md` - a guide for the Apache Openserverless contributors