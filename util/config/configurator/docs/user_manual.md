# ops configurator - User Manual

The ops configurator is an interactive terminal tool for editing the configuration parameters used by the `ops` CLI. It groups parameters by cloud provider or service component, lets you navigate with arrow keys, and saves your work automatically so you can resume after an interruption.

---

## Table of contents

1. [Prerequisites](#1-prerequisites)
2. [Starting the tool](#2-starting-the-tool)
3. [Navigating the component menu](#3-navigating-the-component-menu)
4. [Editing parameters](#4-editing-parameters)
5. [Exiting and saving your work](#5-exiting-and-saving-your-work)
6. [Resuming an interrupted session](#6-resuming-an-interrupted-session)
7. [Available components](#7-available-components)
8. [Keyboard reference](#8-keyboard-reference)
9. [TOML configuration file format](#9-toml-configuration-file-format)

---

## 1. Prerequisites

- `bun` runtime installed
- Dependencies installed in the configurator directory:

```bash
cd util/config/configurator
bun install
```

If you use the `ops` CLI, the configurator is invoked automatically and no separate setup is needed.

---

## 2. Starting the tool

### From the ops CLI (standard usage)

```bash
ops util config
```

### Directly with bun (development / standalone)

```bash
cd util/config/configurator
bun run start
```

### Help

```bash
bun run start -- --help
```

When started, the tool displays a banner and loads the master configuration file `all-config-parameters.toml` located in the same directory. If a previous session was interrupted, it automatically resumes from the saved draft (see [section 6](#6-resuming-an-interrupted-session)).

---

## 3. Navigating the component menu

After the banner, a component selection menu appears:

```
◆ Select a component to configure (use ↑/↓ arrows, ENTER to select):
│  aws (7 parameters)
│  eks (6 parameters)
│  gcloud (6 parameters)
│  gke (6 parameters)
│  azcloud (6 parameters)
│  aks (7 parameters)
│  redis (4 parameters)
│  postgres (4 parameters)
│  Exit Configuration
```

- **`↑` / `↓`** - move between components
- **`ENTER`** - open the selected component
- **`ESC` or `Ctrl+C`** - cancel and go to the exit menu

Select **Exit Configuration** to leave the component loop and reach the exit menu where you can apply, save, or discard changes.

---

## 4. Editing parameters

### Parameter list

After selecting a component, the screen clears and shows a parameter table followed by a selection menu:

```
┌─────────────────────────────────────────────────────────┐
│ Component: redis                                        │
├──────────────────┬──────────────────────────────────────┤
│ Key              │ Value                                 │
├──────────────────┼──────────────────────────────────────┤
│ REDIS_URL        │ <EMPTY>                               │
│ REDIS_SERVICE    │ <EMPTY>                               │
│ REDIS_PREFIX     │ <EMPTY>                               │
│ REDIS_PASSWORD   │ <EMPTY>                               │
└──────────────────┴──────────────────────────────────────┘

◆ Select a parameter to edit (use ↑/↓ arrows, ENTER to select, ESC or CTRL+C to Cancel):
│  Redis URL = <EMPTY>
│  Redis Service = <EMPTY>
│  Redis Prefix = <EMPTY>
│  Redis password = <EMPTY>
│  ← Back to components
```

Each option shows the parameter's human-readable label and its current value. Password fields always display `***` when set, never the actual value.

Select **← Back to components** to return to the component menu without editing anything.

### Editing a value

When you select a parameter, an input prompt appears:

```
◆ Enter new value for Redis URL:
│  Enter value...
```

- Type the new value and press **`ENTER`** to confirm.
- Press **`Ctrl+C`** or **`ESC`** to cancel - the previous value is preserved unchanged.
- For **mandatory parameters**, submitting an empty value is rejected with an error message.

### Password parameters

Password fields use a masked prompt:

```
◆ Enter new value for Redis password:
│  ········
```

Input is hidden. The same cancel behaviour applies.

### Parameters with hints

Some parameters include a hint note displayed before the prompt, explaining valid values or pointing to external commands. For example, `AWS_VM_INSTANCE_TYPE` shows:

```
┌─ What is this parameter for? ────────────────────────────┐
│                                                          │
│  The suggested instance type has 8GB and 2vcpus.        │
│  To get a list of valid values, use:                     │
│  aws ec2 describe-instance-types \                       │
│    --query 'InstanceTypes[].InstanceType' --output table │
│                                                          │
└──────────────────────────────────────────────────────────┘

◆ Enter new value for AWS Instance type to use for VMs:
│  t3a.large
```

### After saving a value

A confirmation line is printed immediately:

```
✓ Updated REDIS_URL to: redis://localhost:6379
```

The change is also written to the `.tmp` draft file automatically (see [section 6](#6-resuming-an-interrupted-session)).

---

## 5. Exiting and saving your work

When you exit the component loop (via "Exit Configuration" or `Ctrl+C`), the tool shows a summary of all modified parameters and then presents three options:

```
┌─ Modified parameters ──────────────────────────────────┐
│  redis                                                 │
│    REDIS_URL: redis://localhost:6379                   │
│    REDIS_PASSWORD: ***                                 │
└────────────────────────────────────────────────────────┘

◆ What would you like to do with your changes?
│  Apply configuration directly
│  Save configuration to file
│  Discard all changes
```

### Apply configuration directly

Runs `ops -config KEY=VALUE` for every modified parameter. Skips parameters with an empty value. Prints a result line for each:

```
✓ Set REDIS_URL=redis://localhost:6379
✓ Set REDIS_PASSWORD=***
Applied 2 configuration(s).
```

On full success, the `.tmp` draft file is deleted.

### Save configuration to file

Writes only the modified parameters to a timestamped TOML file in the current directory:

```
✓ Configuration saved to: ops-config-2026-06-08T14-30-00.toml
```

You are then asked whether to clear the draft file:

```
◆ Clear partial configuration?
│  Yes
│  No
```

The saved TOML file can be reviewed, edited by hand, or fed back into the tool later.

### Discard all changes

Deletes the `.tmp` draft file and exits cleanly:

```
✓ All changes discarded.
```

---

## 6. Resuming an interrupted session

Every time you confirm a parameter value, the full current state is written to a sidecar file named `<config-file>.tmp` (for example, `all-config-parameters.tmp`). This happens automatically - you do not need to do anything to enable it.

If the tool is closed unexpectedly (power loss, terminal killed, `Ctrl+C` mid-edit), the draft is preserved. The next time you start the tool with the same config file, it detects the `.tmp` file and loads from it instead of the original, so all previously entered values are pre-filled.

To start fresh and discard any saved draft, choose **Discard all changes** at the exit menu, or delete the `.tmp` file manually:

```bash
rm all-config-parameters.tmp
```

---

## 7. Available components

The master config file `all-config-parameters.toml` contains the following components:

| Component | Description | Key parameters |
|-----------|-------------|----------------|
| `aws` | AWS credentials and VM configuration | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `AWS_VM_INSTANCE_TYPE`, … |
| `eks` | Amazon Elastic Kubernetes Service cluster | `EKS_NAME`, `EKS_REGION`, `EKS_COUNT`, `EKS_VM`, `EKS_DISK`, `EKS_KUBERNETES_VERSION` |
| `gcloud` | Google Cloud VM infrastructure | `GCLOUD_PROJECT`, `GCLOUD_REGION`, `GCLOUD_VM`, `GCLOUD_DISK`, `GCLOUD_SSHKEY`, `GCLOUD_IMAGE` |
| `gke` | Google Kubernetes Engine cluster | `GKE_PROJECT`, `GKE_NAME`, `GKE_REGION`, `GKE_COUNT`, `GKE_VM`, `GKE_DISK` |
| `azcloud` | Azure VM infrastructure | `AZCLOUD_PROJECT`, `AZCLOUD_REGION`, `AZCLOUD_VM`, `AZCLOUD_DISK`, `AZCLOUD_SSHKEY`, `AZCLOUD_IMAGE` |
| `aks` | Azure Kubernetes Service cluster | `AKS_PROJECT`, `AKS_NAME`, `AKS_REGION`, `AKS_COUNT`, `AKS_VM`, `AKS_DISK`, `AKS_SSHKEY` |
| `redis` | Redis connection details | `REDIS_URL`, `REDIS_SERVICE`, `REDIS_PREFIX`, `REDIS_PASSWORD` |
| `postgres` | PostgreSQL connection details | `POSTGRES_DATABASE`, `POSTGRES_PORT`, `POSTGRES_USERNAME`, `POSTGRES_PASSWORD` |

---

## 8. Keyboard reference

| Key | Where | Effect |
|-----|-------|--------|
| `↑` / `↓` | Any menu | Move selection up / down |
| `ENTER` | Any menu | Confirm selection |
| `ESC` or `Ctrl+C` | Component menu | Go to exit menu |
| `ESC` or `Ctrl+C` | Parameter menu | Go back to component menu |
| `ESC` or `Ctrl+C` | Value input | Cancel edit, keep previous value |
| `ENTER` | Value input | Save new value |

---

## 9. TOML configuration file format

The configurator reads any TOML file that follows the `[components.<name>]` section structure. This lets you create custom config files for your own components or a subset of parameters.

### Minimal example

```toml
[components.myapp]
APP_HOST = { label = "Application host", initialValue = "localhost", userInputValue = "" }
APP_PORT = { label = "Application port", initialValue = "8080", userInputValue = "" }
```

### Full parameter syntax

```toml
KEY = {
  label          = "Human-readable label shown in the UI",
  initialValue   = "Default value pre-filled from the template",
  userInputValue = "Value entered by the user (empty until edited)",
  isMandatory    = false,
  type           = "string",
  hint           = "Optional multi-line guidance shown before the input prompt"
}
```

| Field | Required | Values | Description |
|-------|----------|--------|-------------|
| `label` | no | string | Text shown in the selection list and input prompt |
| `initialValue` | no | string | Template default; shown as the pre-filled value on first edit |
| `userInputValue` | no | string | The value actually used; updated every time you save |
| `isMandatory` | no | `true` / `false` | If `true`, the prompt rejects an empty submission |
| `type` | no | `"string"` / `"password"` | `"password"` masks the input field |
| `hint` | no | string | Shown as a note box before the input prompt; use `\n` for line breaks |

### Simplified syntax

A bare string value sets the `initialValue` with no label:

```toml
APP_HOST = "localhost"
```

### Disabling a parameter

Prefix the key with `#` to make the parser skip it:

```toml
"#DISABLED_PARAM" = { label = "Not shown", initialValue = "", userInputValue = "" }
```

This is used in `all-config-parameters.toml` to document known ops keys that are not yet wired into the interactive UI.
