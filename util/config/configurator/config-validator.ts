import type { ValidationResult } from './types';
import {ComponentConfig, ConfigParameter} from "./types-core.ts";
import {OpsConfigFile} from "./types-config-file.ts";

/**
 * List of all managed components in OpenServerless.
 * Used to validate that configuration only contains known components.
 */
const MANAGED_COMPONENTS = [
  'redis',
  'postgres',
  'ferretdb',
  'cron',
  'prometheus',
  'slack',
  'mail',
  'affinity',
  'tolerations',
  'quota',
  'alert manager',
  'aws',
  'eks',
  'gcloud',
  'gke',
  'azcloud',
  'alert',
  'aks',
];

/**
 * Validates configuration against business rules.
 * 
 * Checks that:
 * - All component names are from the managed components list
 * - All parameter keys follow naming conventions (uppercase, underscores)
 */
export class ConfigValidator {
  private _config: OpsConfigFile;
  private _managedComponents: string[];
  private _errors: string[];

  /**
   * Creates a new ConfigValidator instance.
   * 
   * @param config - The OpsConfigFile to validate
   * @param managedComponents - List of valid component names (default: MANAGED_COMPONENTS)
   */
  constructor(config: OpsConfigFile, managedComponents: string[] = MANAGED_COMPONENTS) {
    this._config = config;
    this._managedComponents = managedComponents;
    this._errors = [];
  }

  /**
   * Runs all validations and returns the result.
   * 
   * Validates:
   * 1. Component names against managed components list
   * 2. Parameter key naming conventions
   * 
   * @returns ValidationResult with success status and any errors found
   */
  validate(): ValidationResult {
    this._errors = [];

    this.validateComponentNames();
    this.validateAllParameters();

    return {
      success: this._errors.length === 0,
      errors: this._errors,
    };
  }

  /**
   * Validates that all component names are in the managed components list.
   * Adds errors for each unknown component found.
   */
  private validateComponentNames(): void {
    const componentNames = this._config.getComponentNames();

    for (const name of componentNames) {
      if (!this._managedComponents.includes(name)) {
        this._errors.push(`Unknown component: '${name}'. Valid components: ${this._managedComponents.join(', ')}`);
      }
    }
  }

  /**
   * Validates parameters for all components.
   */
  private validateAllParameters(): void {
    const components = this._config.getAllComponents();

    for (const component of components) {
      this.validateComponentParameters(component);
    }
  }

  /**
   * Validates all parameters in a single component.
   * 
   * @param component - The component to validate
   */
  private validateComponentParameters(component: ComponentConfig): void {
    const parameters = component.getAllParameters();

    for (const parameter of parameters) {
      this.validateParameterKey(component.getName(), parameter);
    }
  }

  /**
   * Validates a parameter key naming convention.
   * 
   * Keys must:
   * - Start with uppercase letter
   * - Contain only uppercase letters, numbers, and underscores
   * 
   * @param componentName - Name of the component (for error messages)
   * @param parameter - The parameter to validate
   */
  private validateParameterKey(componentName: string, parameter: ConfigParameter): void {
    const key = parameter.getKey();

    if (!/^[A-Z][A-Z0-9_]*$/.test(key)) {
      this._errors.push(
        `Invalid parameter key '${key}' in component '${componentName}'. Keys must be uppercase letters, numbers, and underscores only`
      );
    }
  }

  /**
   * Returns all validation errors found.
   * Should be called after validate() to get detailed error messages.
   * 
   * @returns Array of error messages
   */
  getErrors(): string[] {
    return this._errors;
  }
}
