import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { PartialConfigManager } from '../partial-config-manager';
import { ConfigDisplay } from '../config-display';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import {EditableComponentConfig, EditableConfigParameter} from "../types-core.ts";
import {EditableOpsConfigFile} from "../types-config-file.ts";

describe('EditableComponentConfig', () => {
    test('should create component with editable parameters', () => {
        const component = new EditableComponentConfig('test');
        const param1 = new EditableConfigParameter('KEY1', '', '', '', '');
        const param2 = new EditableConfigParameter('KEY2', '', '', '', '');

        component.addParameter(param1);
        component.addParameter(param2);

        expect(component.getName()).toBe('test');
        expect(component.getParameterCount()).toBe(2);
        expect(component.getAllParameters()).toHaveLength(2);
        expect(component.getParameter('KEY1')).toBeDefined();
        expect(component.getParameter('KEY3')).toBeUndefined();
    });
});

