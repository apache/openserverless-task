# Automatic runtime image builder

`ops ide deploy` can ensure custom runtime images before updating actions. The
build runs as a Kubernetes BuildKit Job through the OpenServerless system API;
the developer machine does not need Docker.

Projects opt in with generic runtime profiles in their root `package.json`:

```json
{
  "openserverless": {
    "runtimeProfiles": {
      "python-custom": {
        "builder": "python:3.13",
        "requirements": "runtime/python-custom.txt",
        "actions": ["samples/python-custom"]
      }
    }
  }
}
```

Each action can belong to at most one profile. Requirements paths are relative
to the project root and cannot escape it. The builder id is resolved by the
server from an allowlisted catalog; projects cannot select an arbitrary source
image, target repository, namespace, or registry.

The system API derives a content digest from the builder contract, source
image, and requirements. It either returns an existing image or starts a Job.
The deploy task waits for a terminal state and only then adds `--docker` to the
action update. A failed or timed-out build makes `ops ide deploy` fail before
the action is changed.

An explicit `--docker` action argument takes precedence over the generated
profile image. `--dry-run` validates and reports profiles without contacting
the builder API.

Registry endpoints are supplied by cluster configuration:

- the push endpoint is reachable from the BuildKit pod;
- the pull endpoint is reachable from the node container runtime;
- neither endpoint is hardcoded in the deploy task.
