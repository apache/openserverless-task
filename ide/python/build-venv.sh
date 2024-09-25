#!/bin/bash
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

DIR="${1:?directory}"
ZIP="${2:?zip file}"
cd "$DIR"
if ! test -d virtualenv
  then virtualenv virtualenv
fi
source virtualenv/bin/activate
pip install --upgrade pip
pip install -r  requirements.txt
virtualenv/bin/python -m pip uninstall -y -q setuptools wheel pip
touch virtualenv/bin/activate
if test -f "$ZIP"
  then rm "$ZIP"
fi
7zz a "$ZIP" -tzip virtualenv >/dev/null
ls -l $ZIP
date >virtualenv/date


