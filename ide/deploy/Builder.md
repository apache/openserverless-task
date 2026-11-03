# Builder Feature - Implementation Complete

Builder feature for custom runtime images, activated by:
- `ops ide deploy` - Full project deploy with image building
- `ops ide devel` - Watch mode with auto-rebuild on requirement changes
- `ops ide deploy --single <action>` - Single action deploy with image building

Scans `packages/` directory for requirement files, computes hash, and builds custom images via admin API.

The builder documentation is here:
https://github.com/apache/openserverless-admin-api/blob/main/docs/DEPLOYER.md

```json
{
    "source": "<source runtime image>", 
    "target": "<target image tag>", 
    "kind": "{{.KIND}}", 
    "file": "{{.REQUIREMENTS}}" 
}
```

**Parameters:**
- `source` - Runtime image to extend, resolved via `getRuntimeImage(kind, version)`:
  - Reads `$OPS_ROOT/runtimes.json` for the requested `kind`, keeps only the
    entries whose `openserverless.extendible` is `true`, then resolves `version`
    against them (see "Docker Extend Replacement" below), and uses that same
    entry's `image` for the source image.
- `target` - Format: `user:kind-version-hash`
  - `user`: From `$OPSDEV_USERNAME` env var (required, fails if unset)
  - `version`: The resolved runtime version (never the literal `auto`)
  - `hash`: MD5 of requirement file
  - Example: `devel:python-3.13-77aedded8c2be5463dbe4b23176abd92`
- `kind` - Language from requirement file (see table below)
- `file` - Base64-encoded requirement file content

Supported requirements file are:

| language (`kind`) | requirements file |
|-------------------|-------------------|
| python            | requirements.txt  |
| nodejs            | package.json      |
| php               | composer.json     |
| java              | pom.xml           |
| go                | go.mod            |
| ruby              | Gemfile           |
| dotnet            | project.json      |

The reference endpoint is: `/system/api/v1/build/start`.
When sending a POST to the endpoint, the request can be authenticated using the
the wsk token in an authorization header. The token will be 
used to check the user (the target image hash needs to be always in the format 
`user:image-tag`).

The auth token can be extracted using the command:
`ops -wsk property get --auth`

The output will be something like:
`whisk auth		d97403a8-c1aa-49b3-ad5a-50b380ec3ab1:8YpXsnlSBrqWydMRQd4AuOMQ57obmczwi0fAWQlewbGjKhqMxeSRJ24RdsKGefrl`
remove `whisk auth` the auth token will be `d97403a8-c1aa-49b3-ad5a-50b380ec3ab1:8YpXsnlSBrqWydMRQd4AuOMQ57obmczwi0fAWQlewbGjKhqMxeSRJ24RdsKGefrl`

**API Response (200):**
```json
{
  "data": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "job_name": "build-myuser-abc123"
  },
  "message": "Build process initiated successfully"
}
```

## Build Cache

Hashes stored in `.ops/image.<kind>-<version>` (e.g., `.ops/image.python-3.13`), keyed
per resolved version so different versions of the same kind don't overwrite each other.
- Computed: MD5 hash of current requirement file
- Cached: Hash from last successful build for that `<kind>-<version>`
- Rebuild triggered when: `computed !== cached`

## Docker Extend Replacement

Actions with `--docker <kind>:extend:<auto|version>` in comments:
```python
# --docker python:extend:auto
def main(args):
    import requests
    return {}
```

Or targeting a specific version:
```python
# --docker python:extend:3.13
def main(args):
    import requests
    return {}
```

**Version resolution** (`getRuntimeImage(kind, version)` in `builder.js`):
1. Read `$OPS_ROOT/runtimes.json`, keep only the entries of `kind` whose
   `openserverless.extendible` is `true`.
2. If `version` is `auto`, pick the extendible entry with the most recent
   `openserverless.releaseDate`.
3. If `version` is explicit, it must match one of the extendible versions (with or
   without a leading `v`, e.g. `3.13` or `v3.13`). If it doesn't, an error is raised
   listing the extendible versions available for that `kind`.
4. The resolved version is then looked up as `<kind>:<version>` in
   `$OPS_ROOT/runtimes.json` to get the actual source image.

**Processing:**
1. Detect language and requested version from the `--docker <kind>:extend:<auto|version>` annotation
2. Resolve/validate the version as described above
3. Check `.ops/image.<kind>-<resolvedVersion>` for cached hash
4. If no cache, trigger build from `packages/<requirement-file>`
5. Replace: `--docker <kind>:extend:<auto|version>` → `--docker 127.0.0.1:32000/<user>:<kind>-<resolvedVersion>-<hash>`
6. Example: `--docker 127.0.0.1:32000/devel:python-3.13-77aedded8c2be5463dbe4b23176abd92`

If the requested version is not extendible, the error is logged and only that action's
deploy is skipped — the rest of the deploy queue continues.

## Environment Variables

- `OPSDEV_USERNAME` - **Required**, deployment fails if unset
- `OPS_ROOT` - Path to `runtimes.json`
- `OPS_PWD` - Working directory

## Implementation Files

- `builder.js` - Core build logic, API calls, cache management, version resolution
  against the `openserverless` key of each `runtimes.json` entry (`getRuntimeImage`)
- `scan.js` - Calls `scanAndBuildImages()` during full deploy
- `watch.js` - Watches `packages/*.txt|.json|etc` for changes
- `deploy.js` - Handles `--docker <kind>:extend:<auto|version>` replacement, on-demand builds
- `index.js` - Calls `scanAndBuildImages()` for `--single` flag
