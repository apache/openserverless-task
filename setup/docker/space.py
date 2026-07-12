# Licensed to the Apache Software Foundation (ASF) under one
# or more contributor license agreements.  See the NOTICE file
# distributed with this work for additional information
# regarding copyright ownership.  The ASF licenses this file
# to you under the Apache License, Version 2.0 (the
# "License"); you may not use this file except in compliance
# with the License.  You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing,
# software distributed under the License is distributed on an
# "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
# KIND, either express or implied.  See the License for the
# specific language governing permissions and limitations
# under the License.

# /// script
# requires-python = ">=3.12"
# dependencies = []
# ///

import shutil
import platform
import os

def get_disk_space_gb(path=None):

    if not path:
        path = "C:\\" if platform.system() == "Windows" else "/"

    total, used, free = shutil.disk_usage(path)
    GB = 1024 ** 3
    return round(free / GB, 2)

REQUIRED_SPACE = int(os.getenv("OPS_REQUIRED_SPACE", "34"))

if __name__ == "__main__":
    print(f"Checking disk space, required: {REQUIRED_SPACE}GB")
    free = get_disk_space_gb()
    if free < REQUIRED_SPACE:
        print(f"Not enough free disk space ({free}/{REQUIRED_SPACE}GB.)")
        exit(1)

    exit(0)