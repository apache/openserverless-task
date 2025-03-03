// Licensed to the Apache Software Foundation (ASF) under one
// or more contributor license agreements.  See the NOTICE file
// distributed with this work for additional information
// regarding copyright ownership.  The ASF licenses this file
// to you under the Apache License, Version 2.0 (the
// "License"); you may not use this file except in compliance
// with the License.  You may obtain a copy of the License at
//
//   http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations
// under the License.

const { spawnSync } = require("child_process");
const fs = require("fs");

const MAINS = ["__main__.py", "index.js", "index.php", "main.go"];

const queue = [];
const activeDeployments = new Map();

let dryRun = false;

export function setDryRun(b) {
  dryRun = b;
}

function exec(cmd) {
  console.log("$", cmd);
  if (!dryRun) {
    spawnSync(cmd, { shell: true, env: process.env, stdio: "inherit" });
  }
}

function extractArgs(files) {
  const res = [];
  for (const file of files) {
    if (fs.existsSync(file)) {
      const lines = fs.readFileSync(file, "utf-8").split("\n");
      for (const line of lines) {
        if (line.startsWith("#-")) {
          res.push(line.trim().substring(1));
        }
        if (line.startsWith("//-")) {
          res.push(line.trim().substring(2));
        }
      }
    }
  }
  return res;
}

const packageDone = new Set();

export function deployPackage(pkg) {
  const ppath = `packages/${pkg}.args`;
  const pargs = extractArgs([ppath]).join(" ");
  const cmd = `$OPS package update ${pkg} ${pargs}`;
  if (!packageDone.has(cmd)) {
    exec(cmd);
    packageDone.add(cmd);
  }
}

export function buildZip(pkg, action) {
  exec(`$OPS ide util zip A=${pkg}/${action}`);
  return `packages/${pkg}/${action}.zip`;
}

export function buildAction(pkg, action) {
  exec(`$OPS ide util action A=${pkg}/${action}`);
  return `packages/${pkg}/${action}.zip`;
}

export function deployAction(artifact) {
  let pkg = '', name='', typ = '';

  if (activeDeployments.has(artifact)) {
    queue.push(artifact);
    return;
  }

  activeDeployments.set(artifact, true);
  const indexInQueue = queue.indexOf(artifact);
  if (indexInQueue>-1) {
    console.log(`> Deploying ${artifact} (from queue: ${indexInQueue})`);
  }

  try {
    const sp = artifact.split("/");
    const spData = sp[sp.length - 1].split(".");
    name = spData[0];
    typ = spData[1];
    pkg = sp[1];
  } catch {
    console.log("! cannot deploy", artifact);
    return;
  }
  
  deployPackage(pkg);

  let toInspect;
  if (typ === "zip") {
    const base = artifact.slice(0, -4);
    toInspect = MAINS.map((m) => `${base}/${m}`);
  } else {
    toInspect = [artifact];
  }

  const args = extractArgs(toInspect).join(" ");
  const actionName = `${pkg}/${name}`;
  exec(`$OPS action update ${actionName} ${artifact} ${args}`);

  activeDeployments.delete(artifact);

  if (queue.length > 0) {
    const nextArtifact = queue.shift();
    console.debug(`deploying from queue artifact ${nextArtifact}`);
    deploy(nextArtifact);
  }
}


/**
 * Deploy a `file`
 * @param file
 */
export function deploy(file) {
  // Uncomment the lines below to test specific files
  // const file = "packages/deploy/hello.py";
  // const file = "packages/deploy/multi.zip";
  // const file = "packages/deploy/multi/__main__.py";
  // const file = "packages/deploy/multi/requirements.txt";
  if (fs.lstatSync(file).isDirectory()) {
    for (const start of MAINS) {
      const sub = `${file}/${start}`;
      if (fs.existsSync(sub)) {
        file = sub;
        break;
      }
    }
  }
  
  const sp = file.split("/");
  if (sp.length > 3) {
    buildZip(sp[1], sp[2]);
    file = buildAction(sp[1], sp[2]);
  }
  deployAction(file);
}
