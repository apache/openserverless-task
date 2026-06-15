import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { PartialConfigManager } from '../partial-config-manager';
import { ConfigDisplay } from '../config-display';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import {ConfigParameter, EditableComponentConfig, EditableConfigParameter} from "../types-core.ts";
import {EditableOpsConfigFile} from "../types-config-file.ts";

describe('ConfigParameter - isMandatory', () => {
    test('should default isMandatory to false', () => {
        const param = new ConfigParameter('KEY');
        expect(param.isMandatory()).toBe(false);
    });

    test('should set isMandatory to true when specified', () => {
        const param = new ConfigParameter('KEY', 'Label', '', '', true);
        expect(param.isMandatory()).toBe(true);
    });

    test('should set isMandatory to false when explicitly false', () => {
        const param = new ConfigParameter('KEY', 'Label', 'val', '', false);
        expect(param.isMandatory()).toBe(false);
    });

    test('should not affect other fields', () => {
        const param = new ConfigParameter('MY_KEY', 'My Label', 'init', 'input', true);
        expect(param.getKey()).toBe('MY_KEY');
        expect(param.getLabel()).toBe('My Label');
        expect(param.getInitialValue()).toBe('init');
        expect(param.getUserInputValue()).toBe('input');
        expect(param.isMandatory()).toBe(true);
    });
});

describe('EditableConfigParameter - isMandatory', () => {
    test('should default isMandatory to false', () => {
        const param = new EditableConfigParameter('KEY', '', '', '', '');
        expect(param.isMandatory()).toBe(false);
    });

    test('should accept isMandatory true', () => {
        const param = new EditableConfigParameter('KEY', 'Label', 'init', '', '', true);
        expect(param.isMandatory()).toBe(true);
    });

    test('should preserve isMandatory through fromConfigParameter', () => {
        const base = new ConfigParameter('KEY', 'Label', 'init', 'input', true);
        const editable = EditableConfigParameter.fromConfigParameter(base);

        expect(editable.getKey()).toBe('KEY');
        expect(editable.isMandatory()).toBe(true);
        expect(editable.getPreviousUserInputValue()).toBe('');
    });

    test('fromConfigParameter should preserve isMandatory false', () => {
        const base = new ConfigParameter('KEY', '', '', '', false);
        const editable = EditableConfigParameter.fromConfigParameter(base);
        expect(editable.isMandatory()).toBe(false);
    });

    test('isMandatory should not be affected by updateUserInputValue', () => {
        const param = new EditableConfigParameter('KEY', '', '', '', '', true);
        param.updateUserInputValue('new_value');
        expect(param.isMandatory()).toBe(true);
    });

    test('isMandatory should not be affected by revertToPrevious', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'current', 'previous', true);
        param.revertToPrevious();
        expect(param.isMandatory()).toBe(true);
    });
});

describe('EditableConfigParameter', () => {
    test('should create instance with all properties', () => {
        const param = new EditableConfigParameter('TEST_KEY', 'Test Label', 'initial', 'current', 'previous');

        expect(param.getKey()).toBe('TEST_KEY');
        expect(param.getLabel()).toBe('Test Label');
        expect(param.getInitialValue()).toBe('initial');
        expect(param.getUserInputValue()).toBe('current');
        expect(param.getPreviousUserInputValue()).toBe('previous');
    });

    test('should update user input value and track previous', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'old_value', '');

        param.updateUserInputValue('new_value');

        expect(param.getUserInputValue()).toBe('new_value');
        expect(param.getPreviousUserInputValue()).toBe('old_value');
    });

    test('should revert to previous value', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'current', 'previous');

        const reverted = param.revertToPrevious();

        expect(reverted).toBe(true);
        expect(param.getUserInputValue()).toBe('previous');
        expect(param.getPreviousUserInputValue()).toBe('');
    });

    test('should not revert when no previous value', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'current', '');

        const reverted = param.revertToPrevious();

        expect(reverted).toBe(false);
        expect(param.getUserInputValue()).toBe('current');
    });

    test('should create from ConfigParameter', () => {
        const baseParam = new EditableConfigParameter('KEY', 'Label', 'initial', 'user', '');
        const editableParam = EditableConfigParameter.fromConfigParameter(baseParam);

        expect(editableParam.getKey()).toBe('KEY');
        expect(editableParam.getLabel()).toBe('Label');
        expect(editableParam.getInitialValue()).toBe('initial');
        expect(editableParam.getUserInputValue()).toBe('user');
        expect(editableParam.getPreviousUserInputValue()).toBe('');
    });
});

describe('ConfigParameter - type', () => {
    test('should default type to string', () => {
        const param = new ConfigParameter('KEY');
        expect(param.getType()).toBe('string');
    });

    test('should set type to password when specified', () => {
        const param = new ConfigParameter('KEY', '', '', '', false, 'password');
        expect(param.getType()).toBe('password');
    });

    test('should set type to string when explicitly specified', () => {
        const param = new ConfigParameter('KEY', '', '', '', false, 'string');
        expect(param.getType()).toBe('string');
    });

    test('should not affect other fields when type is password', () => {
        const param = new ConfigParameter('MY_KEY', 'My Label', 'init', 'input', true, 'password');
        expect(param.getKey()).toBe('MY_KEY');
        expect(param.getLabel()).toBe('My Label');
        expect(param.getInitialValue()).toBe('init');
        expect(param.getUserInputValue()).toBe('input');
        expect(param.isMandatory()).toBe(true);
        expect(param.getType()).toBe('password');
    });
});

describe('EditableConfigParameter - type', () => {
    test('should default type to string', () => {
        const param = new EditableConfigParameter('KEY');
        expect(param.getType()).toBe('string');
    });

    test('should accept type password', () => {
        const param = new EditableConfigParameter('KEY', 'Label', 'init', '', '', false, 'password');
        expect(param.getType()).toBe('password');
    });

    test('should preserve type through fromConfigParameter', () => {
        const base = new ConfigParameter('KEY', 'Label', 'init', '', false, 'password');
        const editable = EditableConfigParameter.fromConfigParameter(base);
        expect(editable.getType()).toBe('password');
    });

    test('fromConfigParameter should preserve type string', () => {
        const base = new ConfigParameter('KEY', '', '', '', false, 'string');
        const editable = EditableConfigParameter.fromConfigParameter(base);
        expect(editable.getType()).toBe('string');
    });

    test('type should not be affected by updateUserInputValue', () => {
        const param = new EditableConfigParameter('KEY', '', '', '', '', false, 'password');
        param.updateUserInputValue('secret');
        expect(param.getType()).toBe('password');
    });

    test('type should not be affected by revertToPrevious', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'current', 'previous', false, 'password');
        param.revertToPrevious();
        expect(param.getType()).toBe('password');
    });
});

describe('ConfigParameter - hint', () => {
    test('should default hint to undefined', () => {
        const param = new ConfigParameter('KEY');
        expect(param.getHint()).toBeUndefined();
    });

    test('should store hint when provided', () => {
        const param = new ConfigParameter('KEY', '', '', '', false, 'string', 'Choose wisely');
        expect(param.getHint()).toBe('Choose wisely');
    });

    test('should store multiline hint', () => {
        const hint = 'Line one\nLine two';
        const param = new ConfigParameter('KEY', '', '', '', false, 'string', hint);
        expect(param.getHint()).toBe(hint);
    });

    test('hint should not affect other fields', () => {
        const param = new ConfigParameter('MY_KEY', 'My Label', 'init', 'input', true, 'password', 'a hint');
        expect(param.getKey()).toBe('MY_KEY');
        expect(param.getLabel()).toBe('My Label');
        expect(param.getInitialValue()).toBe('init');
        expect(param.getUserInputValue()).toBe('input');
        expect(param.isMandatory()).toBe(true);
        expect(param.getType()).toBe('password');
        expect(param.getHint()).toBe('a hint');
    });
});

describe('EditableConfigParameter - hint', () => {
    test('should default hint to undefined', () => {
        const param = new EditableConfigParameter('KEY');
        expect(param.getHint()).toBeUndefined();
    });

    test('should store hint when provided', () => {
        const param = new EditableConfigParameter('KEY', '', '', '', '', false, 'string', 'Use t3a.large');
        expect(param.getHint()).toBe('Use t3a.large');
    });

    test('should preserve hint through fromConfigParameter', () => {
        const base = new ConfigParameter('KEY', 'Label', 'init', '', false, 'string', 'helpful hint');
        const editable = EditableConfigParameter.fromConfigParameter(base);
        expect(editable.getHint()).toBe('helpful hint');
    });

    test('fromConfigParameter with no hint gives undefined', () => {
        const base = new ConfigParameter('KEY', 'Label', 'init', '', false, 'string');
        const editable = EditableConfigParameter.fromConfigParameter(base);
        expect(editable.getHint()).toBeUndefined();
    });

    test('hint should not be affected by updateUserInputValue', () => {
        const param = new EditableConfigParameter('KEY', '', '', '', '', false, 'string', 'my hint');
        param.updateUserInputValue('new_value');
        expect(param.getHint()).toBe('my hint');
    });

    test('hint should not be affected by revertToPrevious', () => {
        const param = new EditableConfigParameter('KEY', '', '', 'current', 'previous', false, 'string', 'my hint');
        param.revertToPrevious();
        expect(param.getHint()).toBe('my hint');
    });
});