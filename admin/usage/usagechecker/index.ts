import {logFormatter} from "./log-formatter";
import {volumeManager} from "./volume-manager";
import {jobOperator} from "./job-operator";
import {parseArgs} from "util";

const jobName = "usage-job";
const template = "usage-job.tpl.yaml";

async function main() {
    const options: { debug: { type: 'boolean', default: boolean } } = {
        debug: {
            type: 'boolean',
            default: false
        },
    };
    const {values} = parseArgs({
        args: Bun.argv,
        options: options,
        strict: true,
        allowPositionals: true,
    });

    const volManager = volumeManager('usage', template, values.debug);
    const fmt = logFormatter(values.debug);
    const job = jobOperator(volManager, fmt, values.debug);
    await job.runJob(jobName).catch(console.error).then(dfRows => {
        if (dfRows) {
            console.table(dfRows);
        }
        job.cleanup(jobName);
    });
};

main().then();