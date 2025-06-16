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

import { existsSync, readFileSync } from 'fs';
import { spawnSync } from 'child_process';
import { cleanupDeployInfo, removeActionFromDeployInfo } from "./syncDeployInfo";

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

/**
 * Undeploy a specific action and update the deployment information
 * @param {string} actionName - The name of the action to undeploy in the format "package/action"
 * @returns {boolean} true if successful, false if error
 */
export function undeployAction(actionName) {
  console.log(`> Undeploying action: ${actionName}`);

  try {
    // Execute the undeploy command
    exec(`$OPS action delete ${actionName}`);

    // Update the deployment information
    const success = removeActionFromDeployInfo(actionName);
    if (success) {
      console.log(`> Action ${actionName} successfully undeployed and removed from deployment information.`);
      return true;
    } else {
      console.error(`> Action ${actionName} was undeployed but could not be removed from deployment information.`);
      return false;
    }
  } catch (error) {
    console.error(`Error undeploying action ${actionName}:`, error);
    return false;
  }
}

/**
 * Undeploy actions and packages based on the deployment information in .ops/deployment.json
 * If no deployment information is found, return an error
 * @param {string} [specificAction] - Optional specific action to undeploy
 * @returns {boolean} true if successful, false if error
 */
export function undeploy(specificAction) {
  // If a specific action is provided, undeploy just that action
  if (specificAction) {
    return undeployAction(specificAction);
  }

  // Otherwise, undeploy all actions and packages from the current project
  if (!existsSync('.ops/deployment.json')) {
    console.error('Error: No OpenServerless project found in the current directory.');
    console.error('Please run this command in a directory with an OpenServerless project.');
    return false;
  }

  try {
    const deploymentInfo = JSON.parse(readFileSync('.ops/deployment.json', 'utf8'));
    const { packages, packageActions } = deploymentInfo;

    if (!packages || !packageActions || packages.length === 0) {
      console.error('Error: No deployment information found.');
      return false;
    }

    console.log("> Undeploy actions and packages from the current project:");

    // Undeploy actions
    for (const pkg of packages) {
      const actions = packageActions[pkg] || [];
      for (const action of actions) {
        const actionName = `${pkg}/${action}`;
        console.log(`>> Undeploy action: ${actionName}`);
        exec(`$OPS action delete ${actionName}`);
      }
    }

    // Undeploy packages
    for (const pkg of packages) {
      console.log(`>> Undeploy package: ${pkg}`);
      exec(`$OPS package delete ${pkg}`);
    }

    cleanupDeployInfo();
    console.log("> Undeployment completed successfully.");
    return true;
  } catch (error) {
    console.error("Error undeploy:", error);
    return false;
  }
}
