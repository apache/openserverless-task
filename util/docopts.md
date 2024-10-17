# Task:  ops util

## Synopsis

```text
Usage:
  util system
  util update-cli
  util check-operator-version <version>
  util secrets
  util nosecrets
  util user-secrets <username>
  util no-user-secrets <username>
  util kubectl <args>...
  util kubeconfig
  util config <configjson> [--override] [--showhelp]
  util upload <folder> [--batchsize=<batchsize>] [--verbose] [--clean]
```

## Commands:
```
-  system                  system info (<os>-<arch> in Go format)
-  update-cli              update the cli downloading the binary
-  check-operator-version  check if you need to update the operator
-  secrets                 generate system secrets 
-  nosecrets               remove system secrets
-  user-secrets            generate user secrets for the given user
-  no-user-secrets         remove user secrets for the given user
-  kubectl                 execute kubectl on current kubeconfig
-  kubeconfig              export OVERWRITING current kubeconfig to ~/.kube/config
-  config                  update configuration file interactively
-  upload                  uploads a folder to the web bucket in OpenServerless.
```

## Options:
```
  --showhelp              Show configuration tool help.
  --override               Override the current configuration.
  --verbose                Provide more details.
  --clean                  Remove all files from the web bucket before upload.
  --batchsize=<batchsize>  Number of concurrent web uploads
```