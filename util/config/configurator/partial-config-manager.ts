import type { Result } from './types';
import {EditableComponentConfig, EditableConfigParameter} from "./types-core.ts";
import {EditableOpsConfigFile} from "./types-config-file.ts";

/**
 * Manages partial configuration state with persistence to .tmp file.
 * 
 * This class provides an abstraction layer for reading and writing
 * partial configuration, enabling users to continue where they left off
 * after exiting the application.
 */
export class PartialConfigManager {
  private _configFilePath: string;
  private _tmpFilePath: string;
  private _config: EditableOpsConfigFile;

  /**
   * Creates a new PartialConfigManager instance.
   * 
   * @param configFilePath - Path to the main configuration file
   */
  constructor(configFilePath: string) {
    this._configFilePath = configFilePath;
    this._tmpFilePath = configFilePath.replace(/\.toml$/, '.tmp');
    this._config = new EditableOpsConfigFile();
  }

  /**
   * Returns the path to the temporary file.
   * 
   * @returns The .tmp file path
   */
  getTmpFilePath(): string {
    return this._tmpFilePath;
  }

  /**
   * Returns the path to the main configuration file.
   * 
   * @returns The configuration file path
   */
  getConfigFilePath(): string {
    return this._configFilePath;
  }

  /**
   * Checks if a partial configuration file exists.
   * 
   * @returns true if .tmp file exists, false otherwise
   */
  async hasPartialConfig(): Promise<boolean> {
    const file = Bun.file(this._tmpFilePath);
    return await file.exists();
  }

  /**
   * Loads configuration from the .tmp file if it exists,
   * otherwise loads from the main configuration file.
   * 
   * @returns Result containing the loaded configuration or error message
   */
  async load(): Promise<Result<EditableOpsConfigFile, string>> {
    try {
      const hasPartial = await this.hasPartialConfig();
      const filePathToLoad = hasPartial ? this._tmpFilePath : this._configFilePath;

      const file = Bun.file(filePathToLoad);
      if (!(await file.exists())) {
        return {
          success: false,
          error: `Configuration file not found: ${filePathToLoad}`,
        };
      }

      const content = await file.text();
      const rawData = await this.parseTomlContent(content);

      if (!rawData) {
        return {
          success: false,
          error: `Failed to parse TOML file: ${filePathToLoad}`,
        };
      }

      this._config = this.extractComponents(rawData);

      return {
        success: true,
        data: this._config,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error loading configuration: ${error}`,
      };
    }
  }

  /**
   * Parses TOML content directly without caching.
   * 
   * @param content - Raw TOML content
   * @returns Parsed TOML data as unknown object, or null on failure
   */
  private async parseTomlContent(content: string): Promise<unknown> {
    try {
      const toml = await import('toml');
      return toml.parse(content);
    } catch (error) {
      return null;
    }
  }

  /**
   * Saves the current configuration state to the .tmp file.
   * 
   * @returns Result indicating success or failure with error message
   */
  async save(): Promise<Result<void, string>> {
    try {
      const tomlData = this.serializeToToml();
      await Bun.write(this._tmpFilePath, tomlData);

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error saving configuration: ${error}`,
      };
    }
  }

  /**
   * Clears the partial configuration by deleting the .tmp file.
   * 
   * @returns Result indicating success or failure with error message
   */
  async clear(): Promise<Result<void, string>> {
    try {
      const file = Bun.file(this._tmpFilePath);
      if (await file.exists()) {
        const { $ } = await import('bun');
        await $`rm ${this._tmpFilePath}`.quiet();
      }
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: `Error clearing partial configuration: ${error}`,
      };
    }
  }

  /**
   * Returns the current configuration state.
   * 
   * @returns The editable configuration
   */
  getConfig(): EditableOpsConfigFile {
    return this._config;
  }

  /**
   * Retrieves a parameter from a specific component.
   * 
   * @param componentName - Name of the component
   * @param key - Parameter key
   * @returns The parameter if found, undefined otherwise
   */
  getParameter(componentName: string, key: string): EditableConfigParameter | undefined {
    const component = this._config.getComponent(componentName);
    if (!component) {
      return undefined;
    }
    return component.getParameter(key);
  }

  /**
   * Sets the user input value for a parameter.
   * 
   * Updates the parameter and automatically saves to the .tmp file.
   * Tracks the previous value in previousUserInputValue.
   * 
   * @param componentName - Name of the component
   * @param key - Parameter key
   * @param value - New user input value
   * @returns Result indicating success or failure
   */
  async setParameter(
    componentName: string,
    key: string,
    value: string
  ): Promise<Result<void, string>> {
    const parameter = this.getParameter(componentName, key);
    if (!parameter) {
      return {
        success: false,
        error: `Parameter '${key}' not found in component '${componentName}'`,
      };
    }

    parameter.updateUserInputValue(value);
    
    const saveResult = await this.save();
    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true };
  }

  /**
   * Reverts a parameter to its previous user input value.
   * 
   * @param componentName - Name of the component
   * @param key - Parameter key
   * @returns Result indicating success or failure
   */
  async revertParameter(
    componentName: string,
    key: string
  ): Promise<Result<void, string>> {
    const parameter = this.getParameter(componentName, key);
    if (!parameter) {
      return {
        success: false,
        error: `Parameter '${key}' not found in component '${componentName}'`,
      };
    }

    const reverted = parameter.revertToPrevious();
    if (!reverted) {
      return {
        success: false,
        error: `No previous value to revert for parameter '${key}'`,
      };
    }

    const saveResult = await this.save();
    if (!saveResult.success) {
      return saveResult;
    }

    return { success: true };
  }

  /**
   * Extracts all components from parsed TOML data.
   * 
   * @param rawData - Parsed TOML data
   * @returns EditableOpsConfigFile containing all extracted components
   */
  private extractComponents(rawData: unknown): EditableOpsConfigFile {
    const config = new EditableOpsConfigFile();

    if (typeof rawData !== 'object' || rawData === null) {
      return config;
    }

    const data = rawData as Record<string, unknown>;

    if (!data.components || typeof data.components !== 'object') {
      return config;
    }

    const components = data.components as Record<string, unknown>;

    for (const [componentName, componentData] of Object.entries(components)) {
      const component = this.parseComponentSection(componentName, componentData);
      if (component.getParameterCount() > 0) {
        config.addComponent(component);
      }
    }

    return config;
  }

  /**
   * Parses a single component section from TOML.
   * 
   * @param sectionName - Name of the component section
   * @param sectionData - Key-value pairs in this section
   * @returns EditableComponentConfig with all parsed parameters
   */
  private parseComponentSection(sectionName: string, sectionData: unknown): EditableComponentConfig {
    const component = new EditableComponentConfig(sectionName);

    if (typeof sectionData !== 'object' || sectionData === null) {
      return component;
    }

    const data = sectionData as Record<string, unknown>;

    for (const [key, value] of Object.entries(data)) {
      if (key.startsWith('#')) {
        continue;
      }

      const parameter = this.parseParameter(key, value);
      component.addParameter(parameter);
    }

    return component;
  }

  /**
   * Parses a single parameter value from TOML.
   * 
   * @param key - The parameter key
   * @param value - The parameter value
   * @returns EditableConfigParameter instance
   */
  private parseParameter(key: string, value: unknown): EditableConfigParameter {
    if (typeof value === 'string') {
      return new EditableConfigParameter(key, '', value, '', '', false);
    }

    if (typeof value === 'object' && value !== null) {
      const data = value as Record<string, unknown>;
      const label = typeof data.label === 'string' ? data.label : '';
      const initialValue = typeof data.initialValue === 'string' ? data.initialValue : '';
      const userInputValue = typeof data.userInputValue === 'string' ? data.userInputValue : '';
      const previousUserInputValue = typeof data.previousUserInputValue === 'string'
        ? data.previousUserInputValue : '';
      const isMandatory = typeof data.isMandatory === 'boolean' ? data.isMandatory : false;
      const type = data.type === 'password' ? 'password' : 'string';
      const hint = typeof data.hint === 'string' ? data.hint : undefined;

      return new EditableConfigParameter(key, label, initialValue, userInputValue, previousUserInputValue, isMandatory, type, hint);
    }

    return new EditableConfigParameter(key, '', '', '', '', false);
  }

  /**
   * Serializes the editable configuration to TOML format.
   * 
   * Format: KEY={label="<LABEL>", initialValue="<VALUE>", userInputValue="<VALUE>", previousUserInputValue="<VALUE>"}
   * 
   * @returns TOML formatted string
   */
  private serializeToToml(): string {
    let toml = '# Partial configuration file\n';
    toml += '# Auto-generated by the ops configurator\n\n';

    const components = this._config.getAllComponents();
    for (const component of components) {
      toml += `[components.${component.getName()}]\n`;

      const parameters = component.getAllParameters();
      for (const param of parameters) {
        const label = this.escapeTomlValue(param.getLabel());
        const initialValue = this.escapeTomlValue(param.getInitialValue());
        const userInputValue = this.escapeTomlValue(param.getUserInputValue());
        const previousUserInputValue = this.escapeTomlValue(param.getPreviousUserInputValue());

        const hintPart = param.getHint() ? `, hint="${this.escapeTomlValue(param.getHint()!)}"` : '';
        toml += `${param.getKey()}={label="${label}", initialValue="${initialValue}", userInputValue="${userInputValue}", previousUserInputValue="${previousUserInputValue}", isMandatory=${param.isMandatory()}, type="${param.getType()}"${hintPart}}\n`;
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

  /**
   * Checks if there are any modifications since the initial load.
   * 
   * @returns true if any parameter has been modified, false otherwise
   */
  hasModifications(): boolean {
    const components = this._config.getAllComponents();
    for (const component of components) {
      const parameters = component.getAllParameters();
      for (const param of parameters) {
        if (param.getUserInputValue() !== '' || param.getPreviousUserInputValue() !== '') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Returns all modified parameters across all components.
   * 
   * @returns Array of objects containing component name and modified parameters
   */
  getModifiedParameters(): Array<{ component: string; parameters: EditableConfigParameter[] }> {
    const modified: Array<{ component: string; parameters: EditableConfigParameter[] }> = [];

    const components = this._config.getAllComponents();
    for (const component of components) {
      const modifiedParams = component.getAllParameters().filter(
        param => param.getUserInputValue() !== '' || param.getPreviousUserInputValue() !== ''
      );

      if (modifiedParams.length > 0) {
        modified.push({
          component: component.getName(),
          parameters: modifiedParams,
        });
      }
    }

    return modified;
  }
}
