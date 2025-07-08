# /// script
# requires-python = ">=3.12"
# depencies = []
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