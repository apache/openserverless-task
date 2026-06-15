import {ComponentConfig, ConfigParameter} from "./types-core.ts";
import {OpsConfigFile} from "./types-config-file.ts";

/**
 * Provides clean API for accessing and modifying configuration data.
 * 
 * Acts as a facade over OpsConfigFile, simplifying access to nested
 * configuration data and providing convenience methods for common operations.
 */
export class ConfigAccessor {
  private _config: OpsConfigFile;

  /**
   * Creates a new ConfigAccessor instance.
   * 
   * @param config - The OpsConfigFile to provide access to
   */
  constructor(config: OpsConfigFile) {
    this._config = config;
  }

  /**
   * Returns all component names in the configuration.
   * 
   * @returns Array of component names
   */
  getComponentNames(): string[] {
    return this._config.getComponentNames();
  }

  /**
   * Retrieves a component by name.
   * 
   * @param name - The component name to look up
   * @returns The ComponentConfig if found, undefined otherwise
   */
  getComponent(name: string): ComponentConfig | undefined {
    return this._config.getComponent(name);
  }

  /**
   * Retrieves a parameter from a specific component.
   * 
   * @param componentName - Name of the component containing the parameter
   * @param key - The parameter key to look up
   * @returns The ConfigParameter if found, undefined otherwise
   */
  getParameter(componentName: string, key: string): ConfigParameter | undefined {
    const component = this._config.getComponent(componentName);
    if (!component) {
      return undefined;
    }
    return component.getParameter(key);
  }

  /**
   * Retrieves the effective value of a parameter.
   * 
   * Returns userInputValue if set, otherwise initialValue.
   * This is the preferred method for getting parameter values.
   * 
   * @param componentName - Name of the component containing the parameter
   * @param key - The parameter key to look up
   * @returns The effective value if found, undefined otherwise
   */
  getParameterValue(componentName: string, key: string): string | undefined {
    const parameter = this.getParameter(componentName, key);
    if (!parameter) {
      return undefined;
    }
    return parameter.getValue();
  }

  /**
   * Sets the user input value for a parameter.
   * 
   * This modifies the configuration in memory. Changes can be persisted
   * by saving the configuration to a file.
   * 
   * @param componentName - Name of the component containing the parameter
   * @param key - The parameter key to modify
   * @param value - The new user input value
   * @returns true if parameter was found and updated, false otherwise
   */
  setParameterValue(componentName: string, key: string, value: string): boolean {
    const parameter = this.getParameter(componentName, key);
    if (!parameter) {
      return false;
    }
    parameter.setUserInputValue(value);
    return true;
  }

  /**
   * Checks if a component exists in the configuration.
   * 
   * @param name - The component name to check
   * @returns true if component exists, false otherwise
   */
  hasComponent(name: string): boolean {
    return this._config.hasComponent(name);
  }

  /**
   * Checks if a parameter exists in a specific component.
   * 
   * @param componentName - Name of the component to check
   * @param key - The parameter key to check
   * @returns true if parameter exists, false otherwise
   */
  hasParameter(componentName: string, key: string): boolean {
    const component = this._config.getComponent(componentName);
    if (!component) {
      return false;
    }
    return component.hasParameter(key);
  }

  /**
   * Returns all components in the configuration.
   * 
   * @returns Array of all ComponentConfig instances
   */
  getAllComponents(): ComponentConfig[] {
    return this._config.getAllComponents();
  }

  /**
   * Returns the number of parameters in a specific component.
   * 
   * @param componentName - Name of the component to count parameters for
   * @returns Number of parameters, or 0 if component not found
   */
  getParameterCount(componentName: string): number {
    const component = this._config.getComponent(componentName);
    if (!component) {
      return 0;
    }
    return component.getParameterCount();
  }
}
