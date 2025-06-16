import {existsSync, mkdirSync, writeFileSync, readFileSync} from "fs";

/**
 * Synchronizes deployment information by saving the provided package and deployment data
 * to a persisted `.ops/deployment.json` file. If the directory `.ops` does not exist, it
 * is created before saving the information.
 *
 * The deployment information is organized by packages, with each package containing an array
 * of its actions. This allows for more granular control when undeploying specific actions.
 *
 * @param {Set<string>} packages - A set of package names to include in the deployment data.
 * @param {Set<string>} deployments - A set of deployment identifiers to include in the deployment data.
 * @return {void}
 */
export function syncDeployInfo(packages, deployments) {
    if (!existsSync('.ops')) {
        mkdirSync('.ops', { recursive: true });
    }

    // Create a structured object with packages as keys and arrays of actions as values
    const packageActions = {};

    // Initialize packages with empty arrays
    for (const pkg of packages) {
        packageActions[pkg] = [];
    }

    // Add actions to their respective packages
    for (const deployment of deployments) {
        try {
            const sp = deployment.split("/");
            const spData = sp[sp.length - 1].split(".");
            const name = spData[0];
            const pkg = sp[1];

            // If the package exists in our structure, add the action to it
            if (packageActions[pkg]) {
                packageActions[pkg].push(name);
            }
        } catch (error) {
            console.error(`Error parsing deployment path ${deployment}:`, error);
        }
    }

    const deploymentInfo = {
        packages: Array.from(packages),
        packageActions: packageActions
    };

    writeFileSync('.ops/deployment.json', JSON.stringify(deploymentInfo, null, 2));
    console.log("> Saved deployment information to .ops/deployment.json");
}

/**
 * Removes a specific action from the deployment information.
 * 
 * @param {string} actionName - The name of the action to remove in the format "package/action".
 * @return {boolean} - True if the action was found and removed, false otherwise.
 */
export function removeActionFromDeployInfo(actionName) {
    if (!existsSync('.ops/deployment.json')) {
        console.error('Error: No deployment information found.');
        return false;
    }

    try {
        const deploymentInfo = JSON.parse(readFileSync('.ops/deployment.json', 'utf8'));
        const [pkg, action] = actionName.split('/');

        if (!deploymentInfo.packageActions || !deploymentInfo.packageActions[pkg]) {
            console.error(`Error: Package ${pkg} not found in deployment information.`);
            return false;
        }

        const actionIndex = deploymentInfo.packageActions[pkg].indexOf(action);
        if (actionIndex === -1) {
            console.error(`Error: Action ${action} not found in package ${pkg}.`);
            return false;
        }

        // Remove the action from the package
        deploymentInfo.packageActions[pkg].splice(actionIndex, 1);

        // If the package has no more actions, remove it from the packages list
        if (deploymentInfo.packageActions[pkg].length === 0) {
            const packageIndex = deploymentInfo.packages.indexOf(pkg);
            if (packageIndex !== -1) {
                deploymentInfo.packages.splice(packageIndex, 1);
            }
            delete deploymentInfo.packageActions[pkg];
        }

        writeFileSync('.ops/deployment.json', JSON.stringify(deploymentInfo, null, 2));
        console.log(`> Removed ${actionName} from deployment information.`);
        return true;
    } catch (error) {
        console.error("Error updating deployment information:", error);
        return false;
    }
}

/**
 * Cleans up deployment information by resetting and synchronizing deployment data.
 */
export function cleanupDeployInfo() {
    syncDeployInfo(new Set(), new Set());
}
