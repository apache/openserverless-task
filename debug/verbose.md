Verbose Taskfile Toggle Script Specification

Purpose

Implement a Bun script that traverses a plugin directory, locates the target ops file, finds the specified task in the Taskfile, and updates its silent setting.

The script must work without external Node dependencies.

It should use yq for YAML editing and assume yq is already installed and available in PATH.

⸻

Expected Taskfile Format

tasks:
  <task>:
    silent: true|false

Example:

tasks:
  sync:
    silent: true


⸻

Command Format

Arguments are positional and must be provided in this order:

<no> <reset> <cmds>...


⸻

Arguments

<no>

Boolean value: true or false

Controls the value of silent for the target task.
	•	true → set silent: true
	•	false → set silent: false

<reset>

Boolean value: true or false
	•	If true, ask the user for confirmation
	•	If confirmed, restore the target file using Git
	•	If false, continue with the normal update flow

<cmds>...

One or more path segments followed by the task name as the final element.

Rules:
	•	All values except the last one are treated as directory names
	•	The last value is treated as the task name
	•	The first value determines the root directory (see Traversal Logic)

Example:

trustable doctor check

Would mean:
	•	First value: trustable → resolves to olaris-trustable plugin directory
	•	Remaining directory path: doctor
	•	Task name: check

Example:

debug kube info

Would mean:
	•	First value: debug → resolves to debug folder inside OPS_ROOT
	•	No additional directory segments
	•	Task name: info

⸻

Traversal Logic
	1.	Take the first value from <cmds>
	2.	Check if a plugin directory olaris-<first> exists inside $OPS_ROOT_PLUGIN
	•	If it exists, use that directory as the root and continue with the remaining <cmds> values
	3.	Otherwise, use $OPS_ROOT as the root and keep all <cmds> values (including the first)
	4.	From the resolved root, descend into the directory tree using all remaining <cmds> values except the last one
	5.	Treat the final <cmds> value as the task name
	6.	Locate the ops file in the resolved directory
	7.	Find the target task under:

tasks.<task>

	8.	Update:

tasks.<task>.silent


⸻

Environment Variables

OPS_ROOT

The main olaris plugin directory. Used as the root when the first <cmd> is not a plugin name.
Required if the first <cmd> does not match a plugin.

OPS_ROOT_PLUGIN

The parent directory containing olaris-* plugin directories.
Required if the first <cmd> matches a plugin name.

⸻

Reset Behavior

If <reset> is true:
	1.	Ask the user for confirmation
	2.	If confirmed:
	•	Run Git restore/reset on the target file
	•	Revert the file to the version stored in Git
	3.	Do not perform any silent modifications

Example confirmation prompt:

Restore ops file from Git? [y/N]


⸻

YAML Update Behavior

When not resetting:
	•	Use yq to modify the YAML file in place
	•	Update:

tasks.<task>.silent

Mapping:
	•	<no> = true → silent: true
	•	<no> = false → silent: false

Example:

Before:

tasks:
  sync:
    silent: false

Command:

verbose true false debug aws s3 sync

After:

tasks:
  sync:
    silent: true


⸻

Example Commands

Enable Verbose Output (main olaris)

verbose false false debug kube info

Behavior:
	•	First cmd: debug → no olaris-debug plugin found
	•	Use $OPS_ROOT as root
	•	Descend into debug/kube
	•	Set tasks.info.silent = false

Disable Verbose Output (plugin)

verbose true false trustable doctor check

Behavior:
	•	First cmd: trustable → olaris-trustable exists in $OPS_ROOT_PLUGIN
	•	Use olaris-trustable as root
	•	Descend into doctor
	•	Set tasks.check.silent = true

Reset File From Git

verbose false true debug kube info

Behavior:
	•	Ask for confirmation
	•	Restore the target file from Git

⸻

Error Conditions

Fail with a clear error if:
	•	OPS_ROOT is not set and first <cmd> is not a plugin
	•	OPS_ROOT_PLUGIN is not set and first <cmd> matches a plugin
	•	The root directory does not exist
	•	The target directory does not exist
	•	The ops file is missing
	•	The task does not exist in the Taskfile
	•	yq is not available in PATH
	•	An invalid boolean value is provided
	•	Fewer than 3 arguments provided

Example errors:

OPS_ROOT is not set.

Task 'sync' not found in ops file.

Could not find ops file in directory: debug/kube
