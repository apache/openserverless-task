import {file} from "bun";
import * as yaml from 'yaml';
import {KubernetesVolume, VolumeMount} from "./models";
import {join} from "node:path";

export interface VolumeManager {
    /**
     * Loads the yaml template of the job.
     *
     * @return {Promise<void>} A promise that resolves when the loading is complete.
     */
    load(): Promise<void>;

    /**
     * Persists the current template to the output file.
     * The output file is prefixed with `_` and the tpl part is removed.
     *
     * @return {Promise<string>} A promise that resolves to a string indicating the relative path of the saved file.
     */
    save(): Promise<string>;

    /**
     * Adds a volume to the Kubernetes job definition resource with the specified configuration.
     *
     * @param {KubernetesVolume} volume - The volume object to be added.
     * @param {string} mountPath - The path within the container where the volume will be mounted.
     * @return {void} This method does not return a value.
     */
    addVolume(volume: KubernetesVolume, mountPath: string): void;
}

class VolumeManagerImpl implements VolumeManager {
    private readonly jobPath: string;
    private readonly dir: string;
    private readonly sourceYaml: string;
    private jobConfig: any;

    constructor(dir: string, jobPath: string) {
        this.jobPath = jobPath;
        this.dir = dir;
        this.sourceYaml = join(dir, jobPath);
    }

    async load(): Promise<void> {
        const content = await file(this.sourceYaml).text();
        this.jobConfig = yaml.parse(content);
    }

    async save(): Promise<string> {
        const updatedYaml = yaml.stringify(this.jobConfig);
        const transformedPath = this.jobPath.replace('.tpl.yaml', '.yaml');
        const target = join(this.dir, `_${transformedPath}`);
        await Bun.write(target, updatedYaml);
        return target;
    }

    addVolume(volume: KubernetesVolume, mountPath: string): void {
        if (!this.jobConfig.spec.template.spec.volumes) {
            this.jobConfig.spec.template.spec.volumes = [];
        }

        this.jobConfig.spec.template.spec.volumes.push(volume);

        const volumeMount: VolumeMount = {
            name: volume.name,
            mountPath,
            readOnly: true
        };
        const containers = this.jobConfig.spec.template.spec.containers;
        if (!containers[0].volumeMounts) {
            containers[0].volumeMounts = [];
        }
        containers[0].volumeMounts.push(volumeMount);
    }
}

class VolumeManagerLogger implements VolumeManager {
    private readonly next: VolumeManager;

    constructor(next: VolumeManager) {
        this.next = next;
    }

    addVolume(volume: KubernetesVolume, mountPath: string): void {
        console.log(`[VolumeManager] Adding volume ${volume.name} at ${mountPath}`);
        console.log(`[VolumeManager] Volume details:
    - Name: ${volume.name}
    - PVC: ${volume.persistentVolumeClaim?.claimName || 'N/A'} 
    - ConfigMap: ${volume.configMap?.name || 'N/A'}
    - Secret: ${volume.secret?.secretName || 'N/A'}
    - Mount Path: ${mountPath}`);
        this.next.addVolume(volume, mountPath);
    }

    async load(): Promise<void> {
        console.log('[VolumeManager] Loading YAML template');
        await this.next.load();
        console.log('[VolumeManager] Template loaded successfully');
    }

    async save(): Promise<string> {
        console.log('[VolumeManager] Saving volume configuration');
        const result = await this.next.save();
        console.log(`[VolumeManager] Configuration saved successfully to: ${result}`);
        return result;
    }
}

/**
 * Factory function to create an instance of VolumeManager.
 *
 * @param {string} dir - The directory containing the job template.
 * @param {string} jobPath - The path associated with the specific job.
 * @param {boolean} debug - Enable debug logging
 * @returns {VolumeManager} An instance of VolumeManager.
 */
export const volumeManager: (dir: string, jobPath: string, debug: boolean) => VolumeManager = (dir: string, jobPath: string, debug: boolean): VolumeManager => {
    const manager = new VolumeManagerImpl(dir, jobPath);
    if (debug) {
        return new VolumeManagerLogger(manager);
    }
    return manager;
}