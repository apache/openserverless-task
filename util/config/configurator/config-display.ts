import { note } from '@clack/prompts';
import { styleText } from 'node:util';
import {EditableConfigParameter} from "./types-core.ts";

export class ConfigDisplay {
  static displayParameterTable(
    componentName: string,
    parameters: EditableConfigParameter[]
  ): void {
    if (parameters.length === 0) {
      note('No parameters configured for this component.', componentName);
      return;
    }

    const mask = (param: EditableConfigParameter, v: string) =>
      param.getType() === 'password' ? (v ? '***' : '<EMPTY>') : (v || '<EMPTY>');

    const columnWidths = this.calculateColumnWidths(parameters);

    const header = styleText('dim',
      'KEY'.padEnd(columnWidths.key) + '  ' +
      'Label'.padEnd(columnWidths.label) + '  ' +
      'Initial Value'.padEnd(columnWidths.initial) + '  ' +
      'Previous Value'.padEnd(columnWidths.previous) + '  ' +
      'Current Value'
    );

    const separator = styleText('dim', '─'.repeat(this.getTotalWidth(columnWidths)));

    const rows = parameters.map(param =>
      param.getKey().padEnd(columnWidths.key) + '  ' +
      (param.getLabel() || '<EMPTY>').padEnd(columnWidths.label) + '  ' +
      mask(param, param.getInitialValue()).padEnd(columnWidths.initial) + '  ' +
      mask(param, param.getPreviousUserInputValue()).padEnd(columnWidths.previous) + '  ' +
      mask(param, param.getValue())
    );

    note([header, separator, ...rows].join('\n'), componentName);
  }

  /**
   * Displays a summary of all components and their parameter counts.
   * 
   * @param components - Array of component data
   */
  static displayComponentSummary(
    components: Array<{ name: string; parameterCount: number; modifiedCount: number }>
  ): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Configuration Summary');
    console.log('='.repeat(60));

    const header = this.formatSimpleRow('Component', 'Parameters', 'Modified');
    console.log(header);
    console.log('-'.repeat(60));

    for (const comp of components) {
      const row = this.formatSimpleRow(
        comp.name,
        comp.parameterCount.toString(),
        comp.modifiedCount.toString()
      );
      console.log(row);
    }

    console.log('='.repeat(60) + '\n');
  }

  /**
   * Displays a single parameter's details.
   * 
   * @param parameter - The parameter to display
   */
  static displayParameterDetail(parameter: EditableConfigParameter): void {
    console.log(`\nParameter: ${parameter.getKey()}`);
    console.log('-'.repeat(40));
    console.log(`Label:              ${parameter.getLabel() || '<EMPTY>'}`);
    console.log(`Initial Value:      ${parameter.getInitialValue() || '<EMPTY>'}`);
    console.log(`Previous Value:     ${parameter.getPreviousUserInputValue() || '<EMPTY>'}`);
    console.log(`Current Value:      ${parameter.getValue() || '<EMPTY>'}`);
    console.log(`Has User Input:     ${parameter.hasUserInput()}`);
    console.log(`Is Mandatory:       ${parameter.isMandatory()}`);
    console.log('-'.repeat(40) + '\n');
  }

  /**
   * Calculates optimal column widths for the parameter table.
   * 
   * @param parameters - Parameters to analyze
   * @returns Object with column widths
   */
  private static calculateColumnWidths(
    parameters: EditableConfigParameter[]
  ): { key: number; label: number; initial: number; previous: number; current: number } {
    const widths = {
      key:      'KEY'.length,
      label:    'Label'.length,
      initial:  'Initial Value'.length,
      previous: 'Previous Value'.length,
      current:  'Current Value'.length,
    };

    for (const param of parameters) {
      const mask = (v: string) => param.getType() === 'password' ? (v ? '***' : '<EMPTY>') : (v || '<EMPTY>');
      widths.key      = Math.max(widths.key,      param.getKey().length);
      widths.label    = Math.max(widths.label,    (param.getLabel() || '<EMPTY>').length);
      widths.initial  = Math.max(widths.initial,  mask(param.getInitialValue()).length);
      widths.previous = Math.max(widths.previous, mask(param.getPreviousUserInputValue()).length);
      widths.current  = Math.max(widths.current,  mask(param.getValue()).length);
    }

    return widths;
  }

  /**
   * Formats a single row of the parameter table.
   * 
   * @param key - Parameter key
   * @param label - Parameter label
   * @param initial - Initial value
   * @param previous - Previous user input value
   * @param current - Current value
   * @param widths - Column widths
   * @returns Formatted row string
   */
  private static formatRow(
    key: string,
    label: string,
    initial: string,
    previous: string,
    current: string,
    widths: { key: number; label: number; initial: number; previous: number; current: number }
  ): string {
    const padKey = key.padEnd(widths.key).substring(0, widths.key);
    const padLabel = label.padEnd(widths.label).substring(0, widths.label);
    const padInitial = initial.padEnd(widths.initial).substring(0, widths.initial);
    const padPrevious = previous.padEnd(widths.previous).substring(0, widths.previous);
    const padCurrent = current.padEnd(widths.current).substring(0, widths.current);

    return `${padKey} | ${padLabel} | ${padInitial} | ${padPrevious} | ${padCurrent}`;
  }

  /**
   * Formats a simple two-column row.
   * 
   * @param col1 - First column value
   * @param col2 - Second column value
   * @param col3 - Third column value
   * @returns Formatted row string
   */
  private static formatSimpleRow(col1: string, col2: string, col3: string): string {
    return `${col1.padEnd(20)} | ${col2.padEnd(15)} | ${col3.padEnd(15)}`;
  }

  /**
   * Calculates total table width from column widths.
   * 
   * @param widths - Column widths
   * @returns Total width
   */
  private static getTotalWidth(
    widths: { key: number; label: number; initial: number; previous: number; current: number }
  ): number {
    return widths.key + widths.label + widths.initial + widths.previous + widths.current + 8;
  }

  /**
   * Displays modifications summary.
   * 
   * @param modifications - Array of modified parameters by component
   */
  static displayModifications(
    modifications: Array<{ component: string; parameters: EditableConfigParameter[] }>
  ): void {
    if (modifications.length === 0) {
      console.log('No modifications detected.\n');
      return;
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('Modified Parameters');
    console.log('='.repeat(80));

    for (const mod of modifications) {
      console.log(`\n[${mod.component}]`);
      for (const param of mod.parameters) {
        console.log(`  ${param.getKey()}: ${param.getInitialValue() || '<EMPTY>'} → ${param.getValue() || '<EMPTY>'}`);
      }
    }

    console.log('\n' + '='.repeat(80) + '\n');
  }

  /**
   * Clears the terminal screen.
   */
  static clearScreen(): void {
    console.clear();
  }
}
