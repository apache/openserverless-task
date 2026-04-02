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

<no> <reset> <plugindir> <cmds>...


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

<plugindir>

Plugin root directory path.
	•	If a value is provided, use it as the plugin root directory
	•	If empty or not provided, use the value of the OPS_ROOT environment variable
	•	If OPS_ROOT is also not set, use olaris if present in the current directory

<cmds>...

One or more path segments followed by the task name as the final element.

Rules:
	•	All values except the last one are treated as directory names
	•	The last value is treated as the task name

Example:

aws s3 sync

Would mean:
	•	Directory path: aws/s3
	•	Task name: sync

⸻

Traversal Logic
	1.	Determine the plugin root directory
	•	Use <plugindir> if provided
	•	Otherwise use OPS_ROOT from environment
	•	Otherwise use olaris if present in current directory
    •   abort if not available
	2.	Descend into the directory tree using all <cmds> values except the last one
	3.	Treat the final <cmds> value as the task name
	4.	Locate the ops file in the resolved directory
	5.	Find the target task under:

tasks.<task>

	6.	Update:

tasks.<task>.silent


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

verbose true false ./plugins aws s3 sync

After:

tasks:
  sync:
    silent: true


⸻

Example Commands

Enable Verbose Output

verbose false false ./plugins aws s3 sync

Result:

silent: false

Disable Verbose Output

verbose true false ./plugins aws s3 sync

Result:

silent: true

Use OPS_ROOT

verbose true false "" aws s3 sync

Behavior:
	•	Use OPS_ROOT as plugin root
	•	Descend into aws/s3
	•	Update task sync

Reset File From Git

verbose false true ./plugins aws s3 sync

Behavior:
	•	Ask for confirmation
	•	Restore the target file from Git

⸻

Error Conditions

Fail with a clear error if:
	•	Neither <plugindir> nor OPS_ROOT is available
	•	The plugin root directory does not exist
	•	The target directory does not exist
	•	The ops file is missing
	•	The task does not exist in the Taskfile
	•	yq is not available in PATH
	•	An invalid boolean value is provided

Example errors:

Missing plugin root directory. Provide <plugindir> or set OPS_ROOT.

Task 'sync' not found in ops file.

Could not find ops file in directory: aws/s3
