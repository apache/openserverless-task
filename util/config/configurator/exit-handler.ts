import { $ } from 'bun';
import { select, isCancel, cancel } from '@clack/prompts';
import { PartialConfigManager } from './partial-config-manager';
import { ConfigDisplay } from './config-display';
import type { Result } from './types';

const OPS = process.env.OPS || 'ops';

/**
 * Handles application exit workflow with configuration options.
 * 
 * Provides options to:
 * - Apply configuration directly to ops
 * - Save configuration to a file
 * - Discard all changes
 */
export class ExitHandler {
  private _configManager: PartialConfigManager;

  /**
   * Creates a new ExitHandler instance.
   * 
   * @param configManager - The configuration manager instance
   */
  constructor(configManager: PartialConfigManager) {
    this._configManager = configManager;
  }

  /**
   * Handles the exit workflow by presenting options to the user.
   * 
   * @returns Result indicating success or failure with error message
   */
  async handleExit(): Promise<Result<void, string>> {
    const hasModifications = this._configManager.hasModifications();

    if (!hasModifications) {
      console.log('\nNo modifications to apply.\n');
      await this._configManager.clear();
      return { success: true };
    }

    const modifications = this._configManager.getModifiedParameters();
    ConfigDisplay.displayModifications(modifications);

    const action = await select({
      message: 'What would you like to do with your changes?',
      options: [
        { label: 'Apply configuration directly', value: 'apply' },
        { label: 'Save configuration to file', value: 'save' },
        { label: 'Discard all changes', value: 'discard' },
      ],
    });

    if (isCancel(action)) {
      return { success: true };
    }

    switch (action) {
      case 'apply':
        return await this.applyConfiguration();
      case 'save':
        return await this.saveConfigurationToFile();
      case 'discard':
        return await this.discardChanges();
      default:
        return { success: true };
    }
  }

  /**
   * Applies configuration directly to ops by executing ops -config KEY=VALUE commands.
   * 
   * @returns Result indicating success or failure
   */
  private async applyConfiguration(): Promise<Result<void, string>> {
    const modifications = this._configManager.getModifiedParameters();

    if (modifications.length === 0) {
      console.log('No modifications to apply.\n');
      return { success: true };
    }

    console.log('\nApplying configuration to ops...\n');

    let appliedCount = 0;
    let errorCount = 0;

    for (const mod of modifications) {
      for (const param of mod.parameters) {
        const key = param.getKey();
        const value = param.getValue();

        if (!value || value === '') {
          console.log(`Skipping ${key} (empty value)`);
          continue;
        }

        try {
          const { exitCode, stderr } = await $`${OPS} -config ${key}=${value}`.nothrow().quiet();

          if (exitCode === 0) {
            console.log(`✓ Set ${key}=${value}`);
            appliedCount++;
          } else {
            console.error(`✗ Failed to set ${key}: ${stderr.toString()}`);
            errorCount++;
          }
        } catch (error) {
          console.error(`✗ Error setting ${key}: ${error}`);
          errorCount++;
        }
      }
    }

    console.log(`\nApplied ${appliedCount} configuration(s).`);
    if (errorCount > 0) {
      console.log(`Failed to apply ${errorCount} configuration(s).\n`);
    } else {
      console.log();
    }

    if (errorCount === 0) {
      await this._configManager.clear();
      return { success: true };
    } else {
      return {
        success: false,
        error: `Failed to apply ${errorCount} configuration(s)`,
      };
    }
  }

  /**
   * Saves configuration to a TOML file that can be used later.
   * 
   * @returns Result indicating success or failure
   */
  private async saveConfigurationToFile(): Promise<Result<void, string>> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const outputFileName = `ops-config-${timestamp}.toml`;

    try {
      const config = this._configManager.getConfig();
      const tomlData = this.serializeConfigToToml(config);

      await Bun.write(outputFileName, tomlData);

      console.log(`\n✓ Configuration saved to: ${outputFileName}\n`);

      const shouldClear = await select({
        message: 'Clear partial configuration?',
        options: [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ],
      });

      if (!isCancel(shouldClear) && shouldClear === 'yes') {
        await this._configManager.clear();
        console.log('Partial configuration cleared.\n');
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Failed to save configuration: ${error}`,
      };
    }
  }

  /**
   * Discards all changes by clearing the partial configuration.
   * 
   * @returns Result indicating success or failure
   */
  private async discardChanges(): Promise<Result<void, string>> {
    const clearResult = await this._configManager.clear();

    if (clearResult.success) {
      console.log('\n✓ All changes discarded.\n');
    }

    return clearResult;
  }

  /**
   * Serializes configuration to TOML format for file output.
   * 
   * @param config - The configuration to serialize
   * @returns TOML formatted string
   */
  private serializeConfigToToml(config: any): string {
    let toml = '# OpenServerless Configuration\n';
    toml += `# Generated: ${new Date().toISOString()}\n\n`;

    const components = config.getAllComponents();
    for (const component of components) {
      const parameters = component.getAllParameters();
      const modifiedParams = parameters.filter(
        (p: any) => p.getValue() !== '' && p.getValue() !== p.getInitialValue()
      );

      if (modifiedParams.length === 0) {
        continue;
      }

      toml += `[components.${component.getName()}]\n`;

      for (const param of modifiedParams) {
        const key = param.getKey();
        const value = param.getValue();
        const label = param.getLabel();
        const escapedValue = this.escapeTomlValue(value);

        if (label) {
          const escapedLabel = this.escapeTomlValue(label);
          toml += `${key}={label="${escapedLabel}", userInputValue="${escapedValue}"}\n`;
        } else {
          toml += `${key}="${escapedValue}"\n`;
        }
      }

      toml += '\n';
    }

    return toml;
  }

  /**
   * Escapes a value for TOML format.
   * 
   * @param value - The value to escape
   * @returns Escaped string safe for TOML
   */
  private escapeTomlValue(value: string): string {
    return value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }
}
