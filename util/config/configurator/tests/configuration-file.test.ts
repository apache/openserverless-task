import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { PartialConfigManager } from '../partial-config-manager';
import { ConfigDisplay } from '../config-display';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import {EditableComponentConfig, EditableConfigParameter} from "../types-core.ts";
import {EditableOpsConfigFile} from "../types-config-file.ts";


describe('EditableOpsConfigFile', () => {
    test('should create config with editable components', () => {
        const config = new EditableOpsConfigFile();
        const component = new EditableComponentConfig('redis');
        component.addParameter(new EditableConfigParameter('REDIS_URL', '', '', '', ''));

        config.addComponent(component);

        expect(config.getComponentCount()).toBe(1);
        expect(config.getComponent('redis')).toBeDefined();
        expect(config.getAllComponents()).toHaveLength(1);
        expect(config.getComponentNames()).toContain('redis');
    });
});


describe('ConfigDisplay', () => {
    test('should format parameter table', () => {
        const params = [
            new EditableConfigParameter('KEY1', 'Label 1', 'initial1', 'current1', 'prev1'),
            new EditableConfigParameter('KEY2', 'Label 2', 'initial2', '', ''),
        ];

        let output = '';
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = (chunk: any) => { output += chunk.toString(); return true; };

        ConfigDisplay.displayParameterTable('test-component', params);

        process.stdout.write = originalWrite;

        expect(output.length).toBeGreaterThan(0);
        expect(output).toContain('test-component');
        expect(output).toContain('KEY1');
        expect(output).toContain('KEY2');
    });

    test('should format empty parameter table', () => {
        let output = '';
        const originalWrite = process.stdout.write.bind(process.stdout);
        process.stdout.write = (chunk: any) => { output += chunk.toString(); return true; };

        ConfigDisplay.displayParameterTable('empty-component', []);

        process.stdout.write = originalWrite;

        expect(output).toContain('No parameters configured');
    });

    test('should display component summary', () => {
        const components = [
            { name: 'redis', parameterCount: 4, modifiedCount: 1 },
            { name: 'postgres', parameterCount: 5, modifiedCount: 0 },
        ];

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => logs.push(args.join(' '));

        ConfigDisplay.displayComponentSummary(components);

        console.log = originalLog;

        expect(logs.length).toBeGreaterThan(0);
    });

    test('should display parameter detail', () => {
        const param = new EditableConfigParameter('TEST_KEY', 'Test Label', 'initial', 'current', 'prev');

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => logs.push(args.join(' '));

        ConfigDisplay.displayParameterDetail(param);

        console.log = originalLog;

        expect(logs.some(l => l.includes('TEST_KEY'))).toBe(true);
        expect(logs.some(l => l.includes('Test Label'))).toBe(true);
    });

    test('should not display hint in parameter detail (hint is shown by editParameter)', () => {
        const param = new EditableConfigParameter(
            'VM_TYPE', 'VM instance type', '', '', '', false, 'string',
            'The suggested instance type has 8GB RAM'
        );

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => logs.push(args.join(' '));

        ConfigDisplay.displayParameterDetail(param);

        console.log = originalLog;

        expect(logs.some(l => l.includes('Hint:'))).toBe(false);
    });

    test('should display modifications', () => {
        const modifications = [
            {
                component: 'redis',
                parameters: [
                    new EditableConfigParameter('REDIS_URL', 'URL', '', 'new_url', 'old_url'),
                ],
            },
        ];

        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => logs.push(args.join(' '));

        ConfigDisplay.displayModifications(modifications);

        console.log = originalLog;

        expect(logs.some(l => l.includes('redis'))).toBe(true);
        expect(logs.some(l => l.includes('REDIS_URL'))).toBe(true);
    });

    test('should display message when no modifications', () => {
        const logs: string[] = [];
        const originalLog = console.log;
        console.log = (...args: any[]) => logs.push(args.join(' '));

        ConfigDisplay.displayModifications([]);

        console.log = originalLog;

        expect(logs.some(l => l.includes('No modifications detected'))).toBe(true);
    });
});