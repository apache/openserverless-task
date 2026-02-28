import {ComponentConfig, EditableComponentConfig} from "./types-core.ts";

/**
 * Represents the complete configuration in RAM.
 * This class doesn't handle any file I/O or persistence. It is purely an in-memory representation.
 *
 * The class is a simple data structure that stores configuration parameters in memory (RAM). It has:
 * - Private instance variables (_key, _label, _initialValue, _userInputValue)
 * - Getters and setters for these values
 * - No file I/O operations
 * - No database connections
 * - No localStorage/sessionStorage usage
 *
 * Contains all managed components and their configuration parameters.
 * This is the root object for the configuration hierarchy.
 */
export class OpsConfigFile {
    private _components: Map<string, ComponentConfig>;

    /**
     * Creates a new OpsConfigFile instance.
     * Initializes with an empty components map.
     */
    constructor() {
        this._components = new Map<string, ComponentConfig>();
    }

    /**
     * Adds a component configuration.
     * If a component with the same name exists, it will be replaced.
     *
     * @param component - The ComponentConfig to add
     */
    addComponent(component: ComponentConfig): void {
        this._components.set(component.getName(), component);
    }

    /**
     * Retrieves a component by its name.
     *
     * @param name - The component name to look up
     * @returns The ComponentConfig if found, undefined otherwise
     */
    getComponent(name: string): ComponentConfig | undefined {
        return this._components.get(name);
    }

    /**
     * Returns all components in this configuration.
     *
     * @returns Array of all ComponentConfig instances
     */
    getAllComponents(): ComponentConfig[] {
        return Array.from(this._components.values());
    }

    /**
     * Returns all component names in this configuration.
     *
     * @returns Array of component names (strings)
     */
    getComponentNames(): string[] {
        return Array.from(this._components.keys());
    }

    /**
     * Checks if a component with the given name exists.
     *
     * @param name - The component name to check
     * @returns True if component exists, false otherwise
     */
    hasComponent(name: string): boolean {
        return this._components.has(name);
    }

    /**
     * Returns the number of components in this configuration.
     *
     * @returns The component count
     */
    getComponentCount(): number {
        return this._components.size;
    }
}

/**
 * Represents the complete editable configuration with edit tracking.
 *
 * Extends OpsConfigFile to use EditableComponentConfig instead of ComponentConfig,
 * enabling full edit history tracking for all components and parameters.
 */
export class EditableOpsConfigFile extends OpsConfigFile {
    /**
     * Creates a new EditableOpsConfigFile instance.
     */
    constructor() {
        super();
    }

    /**
     * Returns all components in this configuration as EditableComponentConfig instances.
     *
     * @returns Array of all EditableComponentConfig instances
     */
    getAllComponents(): EditableComponentConfig[] {
        return Array.from((this as any)._components.values()) as EditableComponentConfig[];
    }

    /**
     * Retrieves a component by its name.
     *
     * @param name - The component name to look up
     * @returns The EditableComponentConfig if found, undefined otherwise
     */
    getComponent(name: string): EditableComponentConfig | undefined {
        return (this as any)._components.get(name) as EditableComponentConfig | undefined;
    }
}