import {$} from "bun";
import {VolumeManager} from "./volume-manager";
import {LogFormatter} from "./log-formatter";
import {DfRow} from "./models";

interface JobOperator {

    /**
     * Executes a Kubernetes job to analyze volume usage.
     *
     * Explanations:
     * 1. Loads the job template using VolumeManager
     * 2. Retrieves a list of bound PVCs from k8s cluster
     * 3. Mounts each PVC as a read-only volume in the job
     * 4. Applies the job template to the cluster
     * 5. Waits for job completion and extracts raw logs
     * 6. Processes the raw logs into structured data using the LogFormatter
     *
     * TODO: Add support for label/annotation-based PVC selection once supported by openserverless-operator
     *
     * @param {string} jobName - The name of the Kubernetes job (as defined within the template).
     * @return {Promise<DfRow[]>} A promise that resolves with disk usage data for each PVC
     */
    runJob(jobName: string): Promise<DfRow[]>

    /**
     * Cleans up the job to avoid further run conflicts.
     *
     * @param jobName the job to be deleted (as defined within the template).
     */
    cleanup(jobName: string): Promise<void>
}

class JobOperatorImpl implements JobOperator {
    constructor(private volumeManager: VolumeManager, private logProcessor: LogFormatter) {
    }

    async runJob(jobName: string): Promise<DfRow[]> {
        await this.volumeManager.load();
        const pvcList = await this.getPvcList();
        pvcList.forEach((pvcName, i) => {
            this.volumeManager.addVolume(
                {
                    name: `pvc-${pvcName}`,
                    persistentVolumeClaim: {
                        claimName: pvcName
                    }
                },
                `/mnt/data${i}`
            );
        });
        const rawLogs = await this.volumeManager.save()
            .then(tpl => this.applyTemplate(tpl))
            .then(() => this.extractJobLogs(jobName));
        return this.logProcessor.pretty(pvcList, rawLogs);
    }

    async getPvcList() {
        const {stdout: pvcListRaw} = await $`kubectl get pvc -o jsonpath='{range .items[?(@.status.phase=="Bound")]}{.metadata.name}{","}{end}`.quiet();
        return pvcListRaw.toString().split(",").filter(v => v.length > 0);
    }

    async applyTemplate(target: string) {
        await $`kubectl apply -f ${target}`.quiet();
    }

    async extractJobLogs(jobName: string) {
        try {
            await $`kubectl wait --for=condition=complete job/${jobName} --timeout=1m`.quiet();
        } catch (error) {
            console.error(`Job ${jobName} timeout or error.`, error);
            await $`kubectl get job ${jobName}`;
            process.exit(1);
        }
        const {stdout: logs} = await $`kubectl logs job/${jobName}`.quiet();
        return logs.toString().trim();
    }

    async cleanup(jobName: string) {
        await $`kubectl delete job/${jobName}`.quiet();
    }
}


class JobOperatorLogger implements JobOperator {
    constructor(private next: JobOperator) {
    }

    async runJob(jobName: string): Promise<DfRow[]> {
        console.log(`[JobOperator] Starting job: ${jobName}`);
        const result = await this.next.runJob(jobName);
        console.log(`[JobOperator] Job ${jobName} completed successfully`);
        console.log(`[JobOperator] Processed ${result.length} PVC entries`);
        return result;
    }

    async cleanup(jobName: string): Promise<void> {
        console.log(`[JobOperator] Cleaning up job: ${jobName}`);
        await this.next.cleanup(jobName);
        console.log(`[JobOperator] Job ${jobName} cleaned up successfully`);
    }
}

export const jobOperator = (volumeManager: VolumeManager, logFormatter: LogFormatter, debug: boolean): JobOperator => {
    const operator = new JobOperatorImpl(volumeManager, logFormatter);
    if (debug) {
        return new JobOperatorLogger(operator);
    }
    return operator;
};