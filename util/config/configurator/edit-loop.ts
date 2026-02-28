import { select, isCancel, cancel, text, password, note } from '@clack/prompts';
import { PartialConfigManager } from './partial-config-manager';
import { ConfigDisplay } from './config-display';
import { ExitHandler } from './exit-handler';
import type { Result } from './types';
import {EditableComponentConfig, EditableConfigParameter} from "./types-core.ts";

/**
 * Manages the interactive editing loop for configuration.
 * 
 * Provides the main workflow:
 * 1. Display list of components
 * 2. User selects component with arrows + ENTER
 * 3. Display parameters table
 * 4. User selects parameter to edit
 * 5. Edit parameter value
 * 6. Save changes
 * 7. Loop until user exits
 */
export class EditLoop {
  private _configManager: PartialConfigManager;
  private _exitHandler: ExitHandler;
  private _running: boolean;

  /**
   * Creates a new EditLoop instance.
   * 
   * @param configManager - The configuration manager instance
   */
  constructor(configManager: PartialConfigManager) {
    this._configManager = configManager;
    this._exitHandler = new ExitHandler(configManager);
    this._running = false;
  }

  /**
   * Starts the interactive editing loop.
   * 
   * Continues until user chooses to exit.
   */
  async start(): Promise<Result<void, string>> {
    this._running = true;

    while (this._running) {
      const result = await this.selectComponent();

      if (!result.success) {
        if (result.error === 'User cancelled') {
          this._running = false;
          continue;
        }
        return { success: false, error: result.error };
      }

      if (!result.data) {
        this._running = false;
        continue;
      }

      await this.editComponent(result.data);
    }

    return await this._exitHandler.handleExit();
  }

  /**
   * Displays component selection prompt.
   *
   * User can navigate with ↑/↓ arrows and select with ENTER. Pressing ESC or CTRL+C cancels the selection.
   *
   * @returns Result with selected component name or error
   * 
   * Result can be:
   * - { success: false, error: 'No components found in configuration' } when no components are found in the given configuration.
   * - { success: false, error: 'User cancelled' } when user cancels the selection
   * - { success: true, data: 'ComponentName' } when a component is selected
   * - { success: true, data: null } when user chooses to exit
   * - { success: false, error: 'Error message' } on failure or cancellation
   */
  private async selectComponent(): Promise<Result<string | null, string>> {
    const config = this._configManager.getConfig();
    const components = config.getAllComponents();

    if (components.length === 0) {
      return {
        success: false,
        error: 'No components found in configuration',
      };
    }

    const options = components.map((comp) => {
      const paramCount = comp.getParameterCount();
      return {
        label: `${comp.getName()} (${paramCount} parameters)`,
        value: comp.getName(),
      };
    });

    options.push({ label: 'Exit Configuration', value: '__exit__' });

    const selected = await select({
      message: 'Select a component to configure (use ↑/↓ arrows, ENTER to select):',
      options,
    });

    if (isCancel(selected)) {
      return { success: false, error: 'User cancelled' };
    }

    if (selected === '__exit__') {
      return { success: true, data: null };
    }

    return { success: true, data: selected as string };
  }

  /**
   * Handles editing of a specific component.
   * 
   * @param componentName - Name of the component to edit
   */
  private async editComponent(componentName: string): Promise<void> {
    const component = this._configManager.getConfig().getComponent(componentName);

    if (!component) {
      console.error(`Component '${componentName}' not found`);
      return;
    }

    let editingComponent = true;

    while (editingComponent) {
      ConfigDisplay.clearScreen();
      ConfigDisplay.displayParameterTable(componentName, component.getAllParameters());

      const result = await this.selectParameter(component);

      if (!result.success) {
        editingComponent = false;
        continue;
      }

      if (!result.data) {
        editingComponent = false;
        continue;
      }

      await this.editParameter(component, result.data);
    }
  }

  /**
   * Displays parameter selection prompt for a component.
   * 
   * @param component - The component to select parameters from
   * @returns Result with selected parameter key or error
   */
  private async selectParameter(
    component: EditableComponentConfig
  ): Promise<Result<string | null, string>> {
    const parameters = component.getAllParameters();

    if (parameters.length === 0) {
      return { success: false, error: 'No parameters in this component' };
    }

    const options = parameters.map((param) => {
      const raw = param.getValue();
      const currentValue = param.getType() === 'password'
        ? (raw ? '***' : '<EMPTY>')
        : (raw || '<EMPTY>');
      return {
        label: `${param.getLabel()} = ${currentValue}`,
        value: param.getKey(),
      };
    });

    options.push({ label: '← Back to components', value: '__back__' });

    const selected = await select({
      message: 'Select a parameter to edit (use ↑/↓ arrows, ENTER to select, ESC or CTRL+C to Cancel):',
      options,
    });

    if (isCancel(selected)) {
      return { success: false, error: 'User cancelled' };
    }

    if (selected === '__back__') {
      return { success: true, data: null };
    }

    return { success: true, data: selected as string };
  }

  /**
   * Handles editing of a specific parameter.
   * 
   * @param component - The component containing the parameter
   * @param paramKey - The parameter key to edit
   */
  private async editParameter(
    component: EditableComponentConfig,
    paramKey: string
  ): Promise<void> {
    const parameter = component.getParameter(paramKey);

    if (!parameter) {
      console.error(`Parameter '${paramKey}' not found`);
      return;
    }

    // ConfigDisplay.displayParameterDetail(parameter);

    // note("Type new value and press ENTER to confirm\nPress CTRL+C or ESC to cancel. The previous value will be preserved if cancelled\n","Instructions")

    const currentValue = parameter.getUserInputValue() || parameter.getInitialValue();
    const isPassword = parameter.getType() === 'password';
    const hint = parameter.getHint();

    if (hint) {
      note(hint, "What is this parameter for?");
    }

    let value: string | null;

    const promptInput = isPassword
      ? await password({
          //message: `Enter new value for ${paramKey}:`,
          message: `Enter new value for ${parameter.getLabel()}:`,
          validate: (v) => {
            if (parameter.isMandatory() && !v) return 'this field is mandatory and cannot be empty';
            return undefined;
          },
        })
      : await text({
          message: `Enter new value for ${parameter.getLabel()}:`,
          initialValue: currentValue,
          placeholder: currentValue || 'Enter value...',
          validate: (v) => {
            if (parameter.isMandatory() && !v) return 'this field is mandatory and cannot be empty';
            return undefined;
          },
        });

    if (isCancel(promptInput)) {
      console.log('\nCancelled - value unchanged.\n');
      return;
    }
    value = promptInput as string;

    const result = await this._configManager.setParameter(
      component.getName(),
      paramKey,
      value
    );

    if (result.success) {
      console.log(`\n✓ Updated ${paramKey} to: ${isPassword ? '***' : value}\n`);
    } else {
      console.error(`\n✗ Failed to update ${paramKey}: ${result.error}\n`);
    }
  }

  /**
   * Stops the editing loop.
   */
  stop(): void {
    this._running = false;
  }

  /**
   * Checks if the editing loop is running.
   * 
   * @returns true if running, false otherwise
   */
  isRunning(): boolean {
    return this._running;
  }
}
