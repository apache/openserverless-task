import { expect, test, describe, mock } from "bun:test";
import { logFormatter, LogFormatter } from "../log-formatter";
import { DfRow } from "../models";

describe("LogFormatter", () => {
  test("pretty should format raw logs correctly", () => {
    // Create a LogFormatter instance
    const formatter = logFormatter(false);
    
    // Sample PVC list
    const pvcList = ["pvc-1", "pvc-2", "pvc-3"];
    
    // Sample raw df logs (similar to what would come from kubectl)
    const rawDfLogs = `1G     500M   500M   50%
2G     1G     1G     50%
3G     1.5G   1.5G   50%`;
    
    // Expected formatted output
    const expected: DfRow[] = [
      {
        'Pvc Name': 'pvc-1',
        'Size': '1G',
        'Used': '500M',
        'Available': '500M',
        'Use%': '50%'
      },
      {
        'Pvc Name': 'pvc-2',
        'Size': '2G',
        'Used': '1G',
        'Available': '1G',
        'Use%': '50%'
      },
      {
        'Pvc Name': 'pvc-3',
        'Size': '3G',
        'Used': '1.5G',
        'Available': '1.5G',
        'Use%': '50%'
      }
    ];
    
    // Call the pretty method
    const result = formatter.pretty(pvcList, rawDfLogs);
    
    // Verify the result
    expect(result).toEqual(expected);
  });
  
  test("pretty should handle empty input", () => {
    const formatter = logFormatter(false);
    const result = formatter.pretty([], "");
    expect(result).toEqual([]);
  });
  
  test("pretty should filter out lines starting with /", () => {
    const formatter = logFormatter(false);
    const pvcList = ["pvc-1"];
    const rawDfLogs = `/some/path  1G  500M  500M  50%
1G  500M  500M  50%`;
    
    const expected: DfRow[] = [
      {
        'Pvc Name': 'pvc-1',
        'Size': '1G',
        'Used': '500M',
        'Available': '500M',
        'Use%': '50%'
      }
    ];
    
    const result = formatter.pretty(pvcList, rawDfLogs);
    expect(result).toEqual(expected);
  });
  
  test("pretty should skip lines with less than 4 values", () => {
    const formatter = logFormatter(false);
    const pvcList = ["pvc-1", "pvc-2"];
    const rawDfLogs = `1G  500M
1G  500M  500M  50%`;
    
    const expected: DfRow[] = [
      {
        'Pvc Name': 'pvc-2',
        'Size': '1G',
        'Used': '500M',
        'Available': '500M',
        'Use%': '50%'
      }
    ];
    
    const result = formatter.pretty(pvcList, rawDfLogs);
    expect(result).toEqual(expected);
  });
  
  test("debug mode should add logging", () => {
    // Mock console.log
    const originalConsoleLog = console.log;
    const mockConsoleLog = mock(() => {});
    console.log = mockConsoleLog;
    
    try {
      const formatter = logFormatter(true);
      const pvcList = ["pvc-1"];
      const rawDfLogs = `1G  500M  500M  50%`;
      
      formatter.pretty(pvcList, rawDfLogs);
      
      // Verify that console.log was called
      expect(mockConsoleLog).toHaveBeenCalledTimes(2);
      expect(mockConsoleLog).toHaveBeenCalledWith("[LogFormatter] Processing 1 PVCs");
      expect(mockConsoleLog).toHaveBeenCalledWith("[LogFormatter] Formatted 1 rows");
    } finally {
      // Restore original console.log
      console.log = originalConsoleLog;
    }
  });
});