import type { Result } from './types';
import {ComponentConfig, ConfigParameter} from "./types-core.ts";
import {OpsConfigFile} from "./types-config-file.ts";

/**
 * Parses TOML configuration files and creates OpsConfigFile instances.
 * 
 * Responsible for reading configuration from disk, parsing TOML format,
 * and constructing the object-oriented configuration structure.
 */
export class ConfigParser {
  private _filePath: string;

  /**
   * Creates a new ConfigParser instance.
   * 
   * @param filePath - Path to the TOML configuration file
   */
  constructor(filePath: string) {
    this._filePath = filePath;
  }

  /**
   * Loads and parses the TOML configuration file.
   * 
   * Reads the file from disk, parses TOML content, and constructs
   * an OpsConfigFile object with all components and parameters.
   * 
   * @returns Result containing OpsConfigFile on success, or error message on failure
   */
  async load(): Promise<Result<OpsConfigFile, string>> {
    try {
      const file = Bun.file(Bun.pathToFileURL(this._filePath));

      if (!(await file.exists())) {
        return {
          success: false,
          error: `Configuration file not found: ${this._filePath}`,
        };
      }

      const content = await file.text();
      const rawData = await this.parseToml(content);

      if (!rawData) {
        return {
          success: false,
          error: `Failed to parse TOML file: ${this._filePath}`,
        };
      }

      const config = this.extractComponents(rawData);

      return {
        success: true,
        data: config,
      };
    } catch (error) {
      return {
        success: false,
        error: `Error loading configuration: ${error}`,
      };
    }
  }

  /**
   * Parses TOML content using Bun's import assertion.
   * 
   * @param content - Raw TOML content (unused, file imported directly)
   * @returns Parsed TOML data as unknown object, or null on failure
   */
  private async parseToml(content: string): Promise<unknown> {
    try {
      const data = await import(this._filePath, {
        assert: { type: 'toml' },
      });
      return data;
    } catch (error) {
      return null;
    }
  }

  /**
   * Extracts all components from parsed TOML data.
   * 
   * Iterates through the 'components' section in TOML and creates
   * ComponentConfig instances for each section found.
   * 
   * @param rawData - Parsed TOML data
   * @returns OpsConfigFile containing all extracted components
   */
  extractComponents(rawData: unknown): OpsConfigFile {
    const config = new OpsConfigFile();

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
   * Processes all key-value pairs in a component section, creating
   * ConfigParameter instances for each parameter found.
   * Skips keys that start with '#' (commented-out parameters).
   * 
   * @param sectionName - Name of the component section (e.g., 'redis')
   * @param sectionData - Key-value pairs in this section
   * @returns ComponentConfig with all parsed parameters
   */
  parseComponentSection(sectionName: string, sectionData: unknown): ComponentConfig {
    const component = new ComponentConfig(sectionName);

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
   * Handles two formats:
   * - Simple string: `KEY=""` - uses value as initialValue
   * - Object with metadata: `KEY={label="", initialValue="", userInputValue=""}`
   * 
   * @param key - The parameter key
   * @param value - The parameter value (string or object)
   * @returns ConfigParameter instance
   */
  parseParameter(key: string, value: unknown): ConfigParameter {
    if (typeof value === 'string') {
      return new ConfigParameter(key, '', value, '', false);
    }

    if (typeof value === 'object' && value !== null) {
      const data = value as Record<string, unknown>;
      const label = typeof data.label === 'string' ? data.label : '';
      const initialValue = typeof data.initialValue === 'string' ? data.initialValue : '';
      const userInputValue = typeof data.userInputValue === 'string' ? data.userInputValue : '';
      const isMandatory = typeof data.isMandatory === 'boolean' ? data.isMandatory : false;
      const type = data.type === 'password' ? 'password' : 'string';
      const hint = typeof data.hint === 'string' ? data.hint : undefined;

      return new ConfigParameter(key, label, initialValue, userInputValue, isMandatory, type, hint);
    }

    return new ConfigParameter(key, '', '', '', false);
  }
}
