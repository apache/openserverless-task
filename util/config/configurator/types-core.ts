/**
 * Represents a single configuration parameter with metadata.
 *
 * Encapsulates key-value pairs with additional information like label,
 * initial value (from file), and user-provided input value.
 *
 * The `key`, `initialValue`, and `isMandatory` are immutable after construction.
 * Only `label` and `userInputValue` can be modified.
 */
export class ConfigParameter {
    private _key: string;
    private _label: string;
    private _initialValue: string;
    private _userInputValue: string;
    private _isMandatory: boolean;
    private _type: 'string' | 'password';
    private _hint: string | undefined;

    /**
     * Creates a new ConfigParameter instance.
     *
     * @param key - The unique identifier for this parameter (immutable)
     * @param label - Human-readable label for display in UI (default: '')
     * @param initialValue - Initial value loaded from TOML file (default: '')
     * @param userInputValue - User-provided value (default: '')
     * @param isMandatory - Whether this parameter must have a non-empty value (default: false)
     * @param type - Input type: 'string' for plain text, 'password' for masked input (default: 'string')
     * @param hint - Optional guidance text shown to the user when editing this parameter
     */
    constructor(
        key: string,
        label: string = '',
        initialValue: string = '',
        userInputValue: string = '',
        isMandatory: boolean = false,
        type: 'string' | 'password' = 'string',
        hint?: string
    ) {
        this._key = key;
        this._label = label;
        this._initialValue = initialValue;
        this._userInputValue = userInputValue;
        this._isMandatory = isMandatory;
        this._type = type;
        this._hint = hint;
    }

    /**
     * Returns the unique key identifier for this parameter.
     *
     * @returns The parameter key (immutable)
     */
    getKey(): string {
        return this._key;
    }

    /**
     * Returns the human-readable label for this parameter.
     *
     * @returns The parameter label
     */
    getLabel(): string {
        return this._label;
    }

    /**
     * Sets the human-readable label for this parameter.
     *
     * @param label - The new label to set
     */
    setLabel(label: string): void {
        this._label = label;
    }

    /**
     * Returns the initial value loaded from the TOML file.
     * This value is immutable after construction.
     *
     * @returns The initial value from file
     */
    getInitialValue(): string {
        return this._initialValue;
    }

    /**
     * Returns the user-provided input value.
     *
     * @returns The user input value
     */
    getUserInputValue(): string {
        return this._userInputValue;
    }

    /**
     * Sets the user-provided input value.
     *
     * @param value - The new user input value
     */
    setUserInputValue(value: string): void {
        this._userInputValue = value;
    }

    /**
     * Returns the effective value for this parameter.
     *
     * Returns `userInputValue` if set, otherwise falls back to `initialValue`.
     * This follows the requirement that user input takes precedence.
     *
     * @returns The effective value (userInput || initialValue)
     */
    getValue(): string {
        return this._userInputValue || this._initialValue;
    }

    /**
     * Checks if user has provided input for this parameter.
     *
     * @returns True if userInputValue is not empty, false otherwise
     */
    hasUserInput(): boolean {
        return this._userInputValue !== '';
    }

    /**
     * Returns whether this parameter must have a non-empty value.
     *
     * @returns True if the parameter is mandatory, false otherwise
     */
    isMandatory(): boolean {
        return this._isMandatory;
    }

    /**
     * Returns the input type for this parameter.
     *
     * @returns 'password' if input should be masked, 'string' otherwise
     */
    getType(): 'string' | 'password' {
        return this._type;
    }

    /**
     * Returns the optional hint text for this parameter.
     *
     * @returns The hint string if present, undefined otherwise
     */
    getHint(): string | undefined {
        return this._hint;
    }
}

/**
 * Represents configuration for a single managed component.
 *
 * A managed component (e.g., redis, postgres) contains multiple
 * configuration parameters organized as key-value pairs.
 */
export class ComponentConfig {
    private _name: string;
    private _parameters: Map<string, ConfigParameter>;

    /**
     * Creates a new ComponentConfig instance.
     *
     * @param name - The name of the managed component (e.g., 'redis', 'postgres')
     */
    constructor(name: string) {
        this._name = name;
        this._parameters = new Map<string, ConfigParameter>();
    }

    /**
     * Returns the name of this component.
     *
     * @returns The component name
     */
    getName(): string {
        return this._name;
    }

    /**
     * Adds a configuration parameter to this component.
     * If a parameter with the same key exists, it will be replaced.
     *
     * @param parameter - The ConfigParameter to add
     */
    addParameter(parameter: ConfigParameter): void {
        this._parameters.set(parameter.getKey(), parameter);
    }

    /**
     * Retrieves a parameter by its key.
     *
     * @param key - The parameter key to look up
     * @returns The ConfigParameter if found, undefined otherwise
     */
    getParameter(key: string): ConfigParameter | undefined {
        return this._parameters.get(key);
    }

    /**
     * Returns all parameters for this component.
     *
     * @returns Array of all ConfigParameter instances
     */
    getAllParameters(): ConfigParameter[] {
        return Array.from(this._parameters.values());
    }

    /**
     * Returns all parameter keys for this component.
     *
     * @returns Array of parameter keys (strings)
     */
    getParameterKeys(): string[] {
        return Array.from(this._parameters.keys());
    }

    /**
     * Checks if a parameter with the given key exists.
     *
     * @param key - The parameter key to check
     * @returns True if parameter exists, false otherwise
     */
    hasParameter(key: string): boolean {
        return this._parameters.has(key);
    }

    /**
     * Returns the number of parameters in this component.
     *
     * @returns The parameter count
     */
    getParameterCount(): number {
        return this._parameters.size;
    }
}

/**
 * Extends ConfigParameter with edit history tracking.
 *
 * Tracks previousUserInputValue to enable undo functionality
 * and maintain a complete edit history for the configuration workflow.
 */
export class EditableConfigParameter extends ConfigParameter {
    private _previousUserInputValue: string;

    /**
     * Creates a new EditableConfigParameter instance.
     *
     * @param key - The unique identifier for this parameter (immutable)
     * @param label - Human-readable label for display in UI (default: '')
     * @param initialValue - Initial value loaded from TOML file (default: '')
     * @param userInputValue - Current user-provided value (default: '')
     * @param previousUserInputValue - Previous user input value (default: '')
     * @param isMandatory - Whether this parameter must have a non-empty value (default: false)
     * @param type - Input type: 'string' for plain text, 'password' for masked input (default: 'string')
     * @param hint - Optional guidance text shown to the user when editing this parameter
     */
    constructor(
        key: string,
        label: string = '',
        initialValue: string = '',
        userInputValue: string = '',
        previousUserInputValue: string = '',
        isMandatory: boolean = false,
        type: 'string' | 'password' = 'string',
        hint?: string
    ) {
        super(key, label, initialValue, userInputValue, isMandatory, type, hint);
        this._previousUserInputValue = previousUserInputValue;
    }

    /**
     * Returns the previous user input value.
     *
     * @returns The previous user input value
     */
    getPreviousUserInputValue(): string {
        return this._previousUserInputValue;
    }

    /**
     * Sets the previous user input value.
     *
     * @param value - The previous user input value to set
     */
    setPreviousUserInputValue(value: string): void {
        this._previousUserInputValue = value;
    }

    /**
     * Updates the user input value and tracks the previous value.
     *
     * Automatically moves the current userInputValue to previousUserInputValue
     * before setting the new value.
     *
     * @param value - The new user input value
     */
    updateUserInputValue(value: string): void {
        this._previousUserInputValue = this.getUserInputValue();
        this.setUserInputValue(value);
    }

    /**
     * Reverts to the previous user input value.
     *
     * Sets userInputValue to previousUserInputValue and clears previousUserInputValue.
     *
     * @returns true if there was a previous value to revert to, false otherwise
     */
    revertToPrevious(): boolean {
        if (this._previousUserInputValue !== '') {
            this.setUserInputValue(this._previousUserInputValue);
            this._previousUserInputValue = '';
            return true;
        }
        return false;
    }

    /**
     * Creates an EditableConfigParameter from a ConfigParameter instance.
     *
     * @param param - The ConfigParameter to convert
     * @returns A new EditableConfigParameter instance
     */
    static fromConfigParameter(param: ConfigParameter): EditableConfigParameter {
        return new EditableConfigParameter(
            param.getKey(),
            param.getLabel(),
            param.getInitialValue(),
            param.getUserInputValue(),
            '',
            param.isMandatory(),
            param.getType(),
            param.getHint()
        );
    }
}

/**
 * Represents configuration for a single managed component with edit tracking.
 *
 * Extends ComponentConfig to use EditableConfigParameter instead of ConfigParameter,
 * enabling full edit history tracking for all parameters in the component.
 */
export class EditableComponentConfig extends ComponentConfig {
    /**
     * Creates a new EditableComponentConfig instance.
     *
     * @param name - The name of the managed component (e.g., 'redis', 'postgres')
     */
    constructor(name: string) {
        super(name);
    }

    /**
     * Returns all parameters for this component as EditableConfigParameter instances.
     *
     * @returns Array of all EditableConfigParameter instances
     */
    getAllParameters(): EditableConfigParameter[] {
        return Array.from((this as any)._parameters.values()) as EditableConfigParameter[];
    }

    /**
     * Retrieves a parameter by its key.
     *
     * @param key - The parameter key to look up
     * @returns The EditableConfigParameter if found, undefined otherwise
     */
    getParameter(key: string): EditableConfigParameter | undefined {
        return (this as any)._parameters.get(key) as EditableConfigParameter | undefined;
    }
}