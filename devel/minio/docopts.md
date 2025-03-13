<!---
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->
# Tasks  `ops devel minio`

OpenServerless Minio/S3 Development Utilities.

## Synopsis

```text
Usage:
    minio ls [--format=table|raw|json]
    minio lsb <bucket> [--format=table|raw|json]
    minio rm <bucket> <file>
    minio mv <bucket> <file> <dest_bucket> <dest_file>
    minio cp <bucket> <file> <dest_bucket> <dest_file>
    minio put <localfile> <bucket> <file>
    minio get <bucket> <file>
    minio clean <bucket> [<regexp>] [--dryrun]
```

## Commands

```
    ls       retrieve the list of all the user buckets
    lsb      retrieve the content of the specified bucket (recursively)
    rm       remove the given file from the specified bucket
    mv       move a file from a bucket to another
    cp       copy a file from a bucket to another
    put      upload a localfile into the bucket/file
    get      download a bucket file locally
    clean    removes matching files (default pattern is .*) from the specified bucket (recursively)
```