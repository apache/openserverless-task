import {DfRow} from "./models";

export interface LogFormatter {
    /**
     * Formats raw log data based on a list of PVCs (Persistent Volume Claims) into a structured list of objects.
     *
     * @param {string[]} pvcList - An array of PVC names to filter and process the log data.
     * @param {string} rawDfLogs - The raw log data taken from the usage-job to be formatted.
     * @return {DfRow[]} Returns an array of table rows containing the pre-processed and structured log data.
     */
    pretty(pvcList: string[], rawDfLogs: string): DfRow[];
}

class LogFormatterImpl implements LogFormatter {
    pretty(pvcList: string[], rawDfLogs: string): DfRow[] {
        const tabularData: DfRow[] = [];
        const lines = rawDfLogs.split('\n').filter(v => !(/^\//.test(v)));
        for (let i = 0; i < lines.length; i++) {
            const values = lines[i].trim().split(/\s+/);
            if (values.length < 4) {
                continue;
            }
            tabularData.push({
                'Pvc Name': pvcList[i],
                'Size': values[0],
                'Used': values[1],
                'Available': values[2],
                'Use%': values[3]
            });
        }
        return tabularData;
    }
}


class LogFormatterLogger implements LogFormatter {
    constructor(private next: LogFormatter) {
    }

    pretty(pvcList: string[], rawDfLogs: string): DfRow[] {
        console.log(`[LogFormatter] Processing ${pvcList.length} PVCs`);
        const result = this.next.pretty(pvcList, rawDfLogs);
        console.log(`[LogFormatter] Formatted ${result.length} rows`);
        return result;
    }
}

export const logFormatter = (debug: boolean = false): LogFormatter => {
    const formatter = new LogFormatterImpl();
    if (debug) {
        return new LogFormatterLogger(formatter);
    }
    return formatter;
};
