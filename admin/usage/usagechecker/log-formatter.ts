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
        let logLines = rawDfLogs.split('\n');
        let startIndex = 1;
        if (logLines.length === pvcList.length * 2) {
            // The filesystem output is likely too long, causing df logs to double in size
            // This happens when the filesystem path exceeds the terminal width
            logLines = logLines.filter(v => !(/^\//.test(v)));
            // in this case the Size is at the first slot
            startIndex = 0;
        }
        for (let i = 0; i < logLines.length; i++) {
            const values = logLines[i].trim().split(/\s+/);
            if (values.length < 4) {
                continue;
            }
            tabularData.push({
                'Pvc Name': pvcList[i],
                'Size': values[startIndex],
                'Used': values[1+startIndex],
                'Available': values[2+startIndex],
                'Use%': values[3+startIndex]
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
