import { expect, test, describe } from 'bun:test';
import { ConfigParser } from '../config-parser';
import { join } from 'path';

const fixturesDir = join(import.meta.dir, 'fixtures');

// ─── parseParameter ──────────────────────────────────────────────────────────

describe('ConfigParser.parseParameter', () => {
    const parser = new ConfigParser('');

    test('string value uses value as initialValue', () => {
        const param = parser.parseParameter('MY_KEY', 'hello');
        expect(param.getKey()).toBe('MY_KEY');
        expect(param.getInitialValue()).toBe('hello');
        expect(param.getLabel()).toBe('');
        expect(param.getUserInputValue()).toBe('');
        expect(param.isMandatory()).toBe(false);
        expect(param.getType()).toBe('string');
    });

    test('empty string value produces empty initialValue', () => {
        const param = parser.parseParameter('EMPTY', '');
        expect(param.getInitialValue()).toBe('');
        expect(param.isMandatory()).toBe(false);
    });

    test('object value maps all fields', () => {
        const param = parser.parseParameter('DB_HOST', {
            label: 'Database host',
            initialValue: '127.0.0.1',
            userInputValue: 'prod.db.local',
            isMandatory: false,
        });
        expect(param.getKey()).toBe('DB_HOST');
        expect(param.getLabel()).toBe('Database host');
        expect(param.getInitialValue()).toBe('127.0.0.1');
        expect(param.getUserInputValue()).toBe('prod.db.local');
        expect(param.isMandatory()).toBe(false);
        expect(param.getType()).toBe('string');
    });

    test('object with isMandatory true', () => {
        const param = parser.parseParameter('SECRET', {
            label: 'Secret key',
            initialValue: '',
            userInputValue: '',
            isMandatory: true,
        });
        expect(param.isMandatory()).toBe(true);
    });

    test('object with type password', () => {
        const param = parser.parseParameter('API_SECRET', {
            label: 'API Secret',
            initialValue: '',
            userInputValue: '',
            type: 'password',
        });
        expect(param.getType()).toBe('password');
    });

    test('object with type string is explicit string', () => {
        const param = parser.parseParameter('API_KEY', {
            label: 'API Key',
            initialValue: '',
            userInputValue: '',
            type: 'string',
        });
        expect(param.getType()).toBe('string');
    });

    test('object with unknown type defaults to string', () => {
        const param = parser.parseParameter('KEY', { type: 'email' });
        expect(param.getType()).toBe('string');
    });

    test('object without type defaults to string', () => {
        const param = parser.parseParameter('KEY', { label: 'Some label' });
        expect(param.getType()).toBe('string');
    });

    test('object with missing fields falls back to defaults', () => {
        const param = parser.parseParameter('KEY', {});
        expect(param.getLabel()).toBe('');
        expect(param.getInitialValue()).toBe('');
        expect(param.getUserInputValue()).toBe('');
        expect(param.isMandatory()).toBe(false);
    });

    test('object with non-string label field is ignored', () => {
        const param = parser.parseParameter('KEY', { label: 42, initialValue: 'x' });
        expect(param.getLabel()).toBe('');
        expect(param.getInitialValue()).toBe('x');
    });

    test('null value returns parameter with empty fields', () => {
        const param = parser.parseParameter('KEY', null);
        expect(param.getKey()).toBe('KEY');
        expect(param.getInitialValue()).toBe('');
        expect(param.getUserInputValue()).toBe('');
        expect(param.isMandatory()).toBe(false);
    });

    test('number value returns parameter with empty fields', () => {
        const param = parser.parseParameter('NUM_KEY', 42);
        expect(param.getInitialValue()).toBe('');
        expect(param.getUserInputValue()).toBe('');
    });

    test('object with hint field extracts it', () => {
        const param = parser.parseParameter('VM_TYPE', {
            label: 'VM instance type',
            hint: 'Choose an instance with at least 8GB RAM',
        });
        expect(param.getHint()).toBe('Choose an instance with at least 8GB RAM');
    });

    test('object with multiline hint preserves newlines', () => {
        const param = parser.parseParameter('VM_TYPE', {
            hint: 'Line one\nLine two\nLine three',
        });
        expect(param.getHint()).toBe('Line one\nLine two\nLine three');
    });

    test('object without hint field returns undefined', () => {
        const param = parser.parseParameter('NO_HINT', { label: 'No hint here' });
        expect(param.getHint()).toBeUndefined();
    });

    test('object with non-string hint is ignored', () => {
        const param = parser.parseParameter('BAD_HINT', { hint: 42 });
        expect(param.getHint()).toBeUndefined();
    });

    test('string value has no hint', () => {
        const param = parser.parseParameter('PLAIN', 'somevalue');
        expect(param.getHint()).toBeUndefined();
    });
});

// ─── parseComponentSection ───────────────────────────────────────────────────

describe('ConfigParser.parseComponentSection', () => {
    const parser = new ConfigParser('');

    test('returns component with correct name', () => {
        const component = parser.parseComponentSection('redis', {});
        expect(component.getName()).toBe('redis');
    });

    test('null sectionData returns empty component', () => {
        const component = parser.parseComponentSection('redis', null);
        expect(component.getParameterCount()).toBe(0);
    });

    test('non-object sectionData returns empty component', () => {
        const component = parser.parseComponentSection('redis', 'invalid');
        expect(component.getParameterCount()).toBe(0);
    });

    test('parses string-valued parameters', () => {
        const component = parser.parseComponentSection('aws', {
            AWS_REGION: 'us-east-1',
            AWS_PROFILE: 'default',
        });
        expect(component.getParameterCount()).toBe(2);
        expect(component.getParameter('AWS_REGION')?.getInitialValue()).toBe('us-east-1');
        expect(component.getParameter('AWS_PROFILE')?.getInitialValue()).toBe('default');
    });

    test('parses object-valued parameters', () => {
        const component = parser.parseComponentSection('redis', {
            REDIS_URL: { label: 'Redis URL', initialValue: 'localhost', userInputValue: '' },
        });
        expect(component.getParameterCount()).toBe(1);
        expect(component.getParameter('REDIS_URL')?.getLabel()).toBe('Redis URL');
    });

    test('skips keys starting with #', () => {
        const component = parser.parseComponentSection('aws', {
            ACTIVE_KEY: 'value',
            '#COMMENTED_KEY': 'should-be-skipped',
        });
        expect(component.getParameterCount()).toBe(1);
        expect(component.hasParameter('ACTIVE_KEY')).toBe(true);
        expect(component.hasParameter('#COMMENTED_KEY')).toBe(false);
    });

    test('adds all parameters to component', () => {
        const component = parser.parseComponentSection('multi', {
            KEY1: 'a',
            KEY2: 'b',
            KEY3: { label: 'C', initialValue: 'c', userInputValue: '' },
        });
        expect(component.getParameterCount()).toBe(3);
        expect(component.getParameterKeys()).toEqual(expect.arrayContaining(['KEY1', 'KEY2', 'KEY3']));
    });
});

// ─── extractComponents ───────────────────────────────────────────────────────

describe('ConfigParser.extractComponents', () => {
    const parser = new ConfigParser('');

    test('null rawData returns empty config', () => {
        const config = parser.extractComponents(null);
        expect(config.getComponentCount()).toBe(0);
    });

    test('non-object rawData returns empty config', () => {
        const config = parser.extractComponents('not an object');
        expect(config.getComponentCount()).toBe(0);
    });

    test('rawData without components key returns empty config', () => {
        const config = parser.extractComponents({ other: 'value' });
        expect(config.getComponentCount()).toBe(0);
    });

    test('components value that is not an object returns empty config', () => {
        const config = parser.extractComponents({ components: 'invalid' });
        expect(config.getComponentCount()).toBe(0);
    });

    test('extracts a single component with parameters', () => {
        const config = parser.extractComponents({
            components: {
                redis: { REDIS_HOST: 'localhost' },
            },
        });
        expect(config.getComponentCount()).toBe(1);
        expect(config.hasComponent('redis')).toBe(true);
        expect(config.getComponent('redis')?.getParameterCount()).toBe(1);
    });

    test('extracts multiple components', () => {
        const config = parser.extractComponents({
            components: {
                redis: { REDIS_HOST: 'localhost' },
                postgres: { DB_NAME: 'mydb', DB_HOST: '127.0.0.1' },
            },
        });
        expect(config.getComponentCount()).toBe(2);
        expect(config.hasComponent('redis')).toBe(true);
        expect(config.hasComponent('postgres')).toBe(true);
        expect(config.getComponent('postgres')?.getParameterCount()).toBe(2);
    });

    test('excludes components with no parameters', () => {
        const config = parser.extractComponents({
            components: {
                empty: {},
                redis: { REDIS_HOST: 'localhost' },
            },
        });
        expect(config.getComponentCount()).toBe(1);
        expect(config.hasComponent('redis')).toBe(true);
        expect(config.hasComponent('empty')).toBe(false);
    });

    test('component with only commented-out keys is excluded', () => {
        const config = parser.extractComponents({
            components: {
                aws: { '#DISABLED': 'value' },
            },
        });
        expect(config.getComponentCount()).toBe(0);
    });

    test('password type flows through to parameter', () => {
        const config = parser.extractComponents({
            components: {
                auth: {
                    API_SECRET: { label: 'API Secret', initialValue: '', userInputValue: '', type: 'password' },
                    API_KEY: { label: 'API Key', initialValue: '', userInputValue: '' },
                },
            },
        });
        expect(config.getComponent('auth')?.getParameter('API_SECRET')?.getType()).toBe('password');
        expect(config.getComponent('auth')?.getParameter('API_KEY')?.getType()).toBe('string');
    });
});

// ─── load ─────────────────────────────────────────────────────────────────────

describe('ConfigParser.load', () => {
    test('returns error when file does not exist', async () => {
        const parser = new ConfigParser('/nonexistent/path/config.toml');
        const result = await parser.load();
        expect(result.success).toBe(false);
        expect(result.error).toContain('/nonexistent/path/config.toml');
    });

    test('loads simple.toml and extracts both components', async () => {
        const parser = new ConfigParser(join(fixturesDir, 'simple.toml'));
        const result = await parser.load();
        expect(result.success).toBe(true);
        const config = result.data!;
        expect(config.getComponentCount()).toBe(2);
        expect(config.hasComponent('redis')).toBe(true);
        expect(config.hasComponent('postgres')).toBe(true);
    });

    test('redis component has three parameters with correct values', async () => {
        const parser = new ConfigParser(join(fixturesDir, 'simple.toml'));
        const result = await parser.load();
        const redis = result.data!.getComponent('redis')!;
        expect(redis.getParameterCount()).toBe(3);
        expect(redis.getParameter('REDIS_HOST')?.getLabel()).toBe('Redis hostname');
        expect(redis.getParameter('REDIS_HOST')?.getInitialValue()).toBe('localhost');
        expect(redis.getParameter('REDIS_HOST')?.getUserInputValue()).toBe('redis.example.com');
        expect(redis.getParameter('REDIS_PASSWORD')?.isMandatory()).toBe(true);
    });

    test('postgres component has two parameters including plain string', async () => {
        const parser = new ConfigParser(join(fixturesDir, 'simple.toml'));
        const result = await parser.load();
        const postgres = result.data!.getComponent('postgres')!;
        expect(postgres.getParameterCount()).toBe(2);
        expect(postgres.getParameter('DB_NAME')?.getInitialValue()).toBe('mydb');
    });
});
