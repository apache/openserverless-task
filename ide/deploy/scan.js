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

import {glob} from 'glob';
import {buildAction, buildZip, deployAction, deployPackage, deployProject} from './deploy.js';
import {getOpenServerlessConfig} from './client.js';
import {config} from "dotenv";
import {syncDeployInfo} from "./syncDeployInfo";

/**
 * This function will prepare and deploy the functions in `packages` directory.
 * The user can specify different globs for packages, main and singles using a
 * `package.json` file in the application root directory.
 * In the `package.json` the user can add an `openserverless` object like this:
 * ```package.json
 * [...]
 * "openserverless": {
 *  "requirements": [ array of custom requirements ],
 *  "mains": [ array of custom mains ],
 *  "singles": [ array of custom singles ],
 * }.
 * [...]
 * ```
 * @returns {Promise<void>}
 */
export async function scan() {
    const deployments = new Set();
    const packages = new Set();

    console.log("> Scan:");

    // => REQUIREMENTS
    const defaultReqsGlobs = [
        "packages/*/*/requirements.txt",
        "packages/*/*/package.json",
        "packages/*/*/composer.json",
        "packages/*/*/go.mod"
    ];
    // load user defined requirements or use `defaultReqsGlobs`
    const packageGlobs = getOpenServerlessConfig("requirements", defaultReqsGlobs);
    // requirements
    const reqs = [];

    // Check for additional packages from each package
    // and add them to the requirements array
    for (const pkgGlob of packageGlobs) {
        const items = await glob(pkgGlob);
        for (const item of items) {
            if (!reqs.includes(item)) {
                reqs.push(item);
            }
        }
    }

    // let's package the functions that have requirements
    for (const req of reqs) {
        console.log(">> Requirements:", req);
        const sp = req.split("/");
        const act = buildZip(sp[1], sp[2]);
        deployments.add(act);
        packages.add(sp[1]);
    }

    // => MAINS
    const defaultMainsGlobs = [
        "packages/*/*/index.js",
        "packages/*/*/__main__.py",
        "packages/*/*/index.php",
        "packages/*/*/main.go"
    ];
    // load user defined main functions or use `defaultMainsGlobs`
    const mainsGlobs = getOpenServerlessConfig("mains", defaultMainsGlobs);
    const mains = [];

    for (const mainGlob of mainsGlobs) {
        const items = await glob(mainGlob);
        for (const item of items) {
            if (!mains.includes(item)) {
                mains.push(item);
            }
        }
    }

    for (const main of mains) {
        console.log(">> Main:", main);
        const sp = main.split("/");
        const act = buildAction(sp[1], sp[2]);
        deployments.add(act);
        packages.add(sp[1]);
    }

    // => SINGLES
    const defaultSinglesGlobs = [
        "packages/*/*.py",
        "packages/*/*.js",
        "packages/*/*.php",
        "packages/*/*.go"
    ];
    const singlesGlobs = getOpenServerlessConfig("singles", defaultSinglesGlobs);
    const singles = [];

    for (const singleGlob of singlesGlobs) {
        const items = await glob(singleGlob);
        for (const item of items) {
            if (!singles.includes(item)) {
                singles.push(item);
            }
        }
    }

    for (const single of singles) {
        console.log(">> Action:", single);
        const sp = single.split("/");
        deployments.add(single);
        packages.add(sp[1]);
    }

    console.log("> Deploying:");
    for (const pkg of packages) {
        console.log(">> Package:", pkg);
        deployPackage(pkg);
    }

    for (const action of deployments) {
        console.log(">>> Action:", action);
        deployAction(action);
    }


    // => MANIFESTS
    const defaultProjectGlobs = [
        "packages/*.yaml",
        "packages/*/*.yaml",
    ];
    const manifestsGlobs = getOpenServerlessConfig("manifests", defaultProjectGlobs);
    const manifests = [];

    for (const manifestGlobs of manifestsGlobs) {
        const items = await glob(manifestGlobs);
        for (const item of items) {
            if (!manifests.includes(item)) {
                manifests.push(item);
            }
        }
        manifests.sort((a, b) => a.localeCompare(b));
    }
    if (manifests.length >0 ) {
        if (Bun.file('packages/.env')) {
            console.log("Found packages .env file. Reading it");
            config({ path: "./packages/.env" });
        }
        for (const manifest of manifests) {
            console.log(">>> Manifest:", manifest);
            deployProject(manifest);
        }
    }

    try {
        // Save deployment information with the new structure
        syncDeployInfo(packages, deployments);
    } catch (error) {
        console.error("Error saving deployment information:", error);
    }
}
