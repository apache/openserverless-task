/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

/*
accept two args: "os" and "file"

read the file, accepting either lf or crlf terminators

and rewrite it with the platform's convention

if the first arg is "windows" use crlf, otherwise use lf
*/
const fs = require("fs");

const os = process.argv[2];
const file = process.argv[3];

if (!os || !file) {
  console.error("Usage: stdtext.js <os> <file>");
  process.exit(1);
}

const content = fs.readFileSync(file, "utf8");
const lines = content.split(/\r?\n/);
const eol = os === "windows" ? "\r\n" : "\n";
fs.writeFileSync(file, lines.join(eol));