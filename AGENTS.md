# Apache OpenServerless Task Agent Guidelines

This file provides instructions for agentic coding agents working in this repository.


## Setup commands

- Install Dependencies: `bun install`
- Start development server: ``
- Build the configurator utility: `cd util/config/configurator && bun run build`

## Testing instructions
- Run tests: `bun test`

- Run a single test: `bun test util/config/configurator/tests/index.test.ts`
- Run tests with verbose output `bun test --reporter=verbose`

## Running the application
- Run the configurator utility: `cd util/config/configurator && bun run start`
- Run the configurator utility with a specified configuration file: `bun run start -- <config-file>`
- Run the configurator utility with a specified configuration file overriding existing values: `bun run start -- <config-file> [--override]`


## Code style

- TypeScript strict mode

### Language & Version
- Primary language: TypeScript
- Runtime: Bun (Node.js compatible)
- Target ES version: ES2022+
- Module system: ES Modules (`"type": "module"` in package.json)

### File Organization
- TypeScript files: `.ts` extension
- Test files: `*.test.ts` located in `__tests__` or `tests` directories
- Configuration: TOML (`.toml`) or JSON (`.json`)
- Operations definitions: YAML (`.yml`)

### Imports
1. **Order**:
   - Built-in Node.js/Bun modules (e.g., `import { $ } from "bun";`)
   - Third-party libraries (e.g., `import { select } from "@clack/prompts";`)
   - Local application files (relative paths)

2. **Syntax**:
   - Use ES module syntax: `import { foo } from "bar";`
   - Default imports: `import foo from "bar";`
   - Avoid `require()` syntax

3. **Specific Rules**:
   - Import types separately when needed: `import type { TypeName } from "./types";`
   - Group related imports together
   - No unused imports allowed

### Formatting
- **Indentation**: 2 spaces (not tabs)
- **Line length**: Maximum 100 characters (prefer 80-100)
- **Semicolons**: Required (use semicolons to terminate statements)
- **Quotes**: 
  - Single quotes (`'`) for strings
  - Template literals (`` ` ``) for multi-line or interpolated strings
  - Double quotes (`"`) only when required by JSON or external specifications
- **Commas**: Trailing commas in multi-line objects/arrays
- **Braces**: 
  - Opening brace on the same line as the statement
  - Closing brace on its own line
  - No braces for single-line conditionals when it improves readability

### Types
- **Type Annotations**:
  - Always annotate function parameters
  - Annotate return values for public functions
  - Use type inference for local variables when obvious
- **Interfaces vs Types**:
  - Use `interface` for object shapes that may be extended
  - Use `type` for unions, primitives, complex mapped types
- **Strictness**: Enable strict TypeScript options (null checks, no implicit any, etc.)

### Naming Conventions
- **Files & Directories**: kebab-case (e.g., `configurator.ts`, `all-config-parameters.toml`)
- **Variables & Functions**: camelCase (e.g., `readPositionalFile`, `isInputConfigValid`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `HelpMsg`, `AdditionalArgsMsg`)
- **Types & Interfaces**: PascalCase (e.g., `OpsConfig`, `PromptData`)
- **Classes**: PascalCase (though minimal class usage in this codebase)
- **Boolean Variables**: Prefix with `is`, `has`, `should`, `can` (e.g., `isValid`, `hasError`)

### Error Handling
- **Early Returns**: Handle error conditions first with early returns
- **Async Functions**: Use try/catch for async operations that can fail
- **Bun Specific**: 
  - Use `process.exit(1)` for error exits
  - Use `process.exit(0)` for successful exits
  - Check `success` property on result objects from utils
- **Messages**: 
  - Export constant error messages (as seen with `HelpMsg`, `NotValidJsonMsg`, etc.)
  - Use descriptive, user-friendly error messages
  - Log warnings with `console.warn()`, errors with `console.error()`

### Specific Patterns from Codebase
- **Configuration Validation**: Separate validation functions (e.g., `isInputConfigValid`)
- **File Operations**: 
  - Read → Parse → Validate pattern
  - Return objects with `{ success: boolean, message?: string, ...data }` shape
- **CLI Argument Parsing**: Use `util.parseArgs` with strict mode and positionals
- **Interactive Prompts**: Use `@clack/prompts` with proper cancellation handling
- **Shell Commands**: Use Bun's `$` helper for shell commands with `.quiet()` to suppress output

### Testing
- **Framework**: Bun's built-in test framework (`bun:test`)
- **File Naming**: `*.test.ts`
- **Structure**:
  - Use `describe()` for test suites
  - Use `test()` for individual tests
  - Use `expect()` for assertions
- **Mocking**: Minimal mocking; prefer testing actual behavior
- **Async Tests**: Return promises or use `async`/`await`

### Comments
- Use JSDoc-style comments for public APIs
- Use `//` for inline comments explaining why (not what)
- Keep comments up-to-date; delete outdated comments
- TODO comments should include GitHub issue references when possible
- When adding bash scripts in the documentation, always keep commands separate (one command per ```bash section)

### Security
- Never log secrets or credentials
- Use `password` prompt type for sensitive inputs
- Validate and sanitize all external inputs
- Follow the principle of least privilege

## Task Tracking

For any task that involves more than one non-trivial step (multi-file changes, investigations with uncertain outcomes, features spanning multiple components), maintain a TODO list using the `TaskCreate` / `TaskUpdate` / `TaskList` tools:

1. **Start**: call `TaskCreate` to create one task entry per step before writing any code.
2. **Progress**: call `TaskUpdate` (status `in_progress`) when starting a step, `completed` when it is done.
3. **Visibility**: after completing a task, call `TaskList` to confirm no steps are left open.

Keep task titles short and action-oriented ("Add `type` field to ConfigParameter", "Update parseParameter", etc.).  
Do **not** create tasks for trivial single-file edits or quick answers.

## Additional Notes
- This repository uses Bun as its primary runtime/package manager
- Configuration is driven by TOML files and environment variables
- The `opsfile.yml` defines operational tasks but is not part of the main TypeScript codebase
- When modifying the configurator utility, remember to rebuild after changes