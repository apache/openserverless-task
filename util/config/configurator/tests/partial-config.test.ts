import { expect, test, describe, beforeEach, afterEach } from 'bun:test';
import { PartialConfigManager } from '../partial-config-manager';
import { ConfigDisplay } from '../config-display';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import {EditableComponentConfig, EditableConfigParameter} from "../types-core.ts";
import {EditableOpsConfigFile} from "../types-config-file.ts";




describe('PartialConfigManager', () => {
  const testConfigPath = './test-config.toml';
  const testTmpPath = './test-config.tmp';

  beforeEach(() => {
    const testConfig = `[components.redis]
REDIS_URL = {label="Redis URL", initialValue="", userInputValue=""}
REDIS_PORT = {label="Redis Port", initialValue="6379", userInputValue=""}
`;
    writeFileSync(testConfigPath, testConfig);
  });

  afterEach(() => {
    try {
      if (existsSync(testConfigPath)) {
        unlinkSync(testConfigPath);
      }
      if (existsSync(testTmpPath)) {
        unlinkSync(testTmpPath);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  test('should check if partial config exists', async () => {
    const manager = new PartialConfigManager(testConfigPath);

    expect(await manager.hasPartialConfig()).toBe(false);
    
    writeFileSync(testTmpPath, '# Partial config');
    
    expect(await manager.hasPartialConfig()).toBe(true);
  });

  test('should load configuration from main file', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    const result = await manager.load();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const config = result.data!;
    expect(config.getComponentCount()).toBe(1);
    expect(config.getComponent('redis')).toBeDefined();
    
    const component = config.getComponent('redis')!;
    expect(component.getParameterCount()).toBe(2);
  });

  test('should save and load partial configuration', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    
    await manager.setParameter('redis', 'REDIS_URL', 'redis://localhost');
    
    expect(existsSync(testTmpPath)).toBe(true);
    
    const manager2 = new PartialConfigManager(testConfigPath);
    const result = await manager2.load();
    
    expect(result.success).toBe(true);
    expect(result.data).toBeDefined();
    
    const redisComponent = result.data!.getComponent('redis');
    expect(redisComponent).toBeDefined();
    
    if (redisComponent) {
      const urlParam = redisComponent.getParameter('REDIS_URL');
      expect(urlParam).toBeDefined();
      if (urlParam) {
        expect(urlParam.getUserInputValue()).toBe('redis://localhost');
      }
    }
  });

  test('should detect modifications', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    
    expect(manager.hasModifications()).toBe(false);
    
    await manager.setParameter('redis', 'REDIS_URL', 'redis://localhost');
    
    expect(manager.hasModifications()).toBe(true);
  });

  test('should get modified parameters', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    
    await manager.setParameter('redis', 'REDIS_URL', 'redis://localhost');
    
    const modified = manager.getModifiedParameters();
    
    expect(modified).toHaveLength(1);
    expect(modified[0].component).toBe('redis');
    expect(modified[0].parameters).toHaveLength(1);
    expect(modified[0].parameters[0].getKey()).toBe('REDIS_URL');
  });

  test('should clear partial configuration', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    
    await manager.setParameter('redis', 'REDIS_URL', 'test');
    
    expect(existsSync(testTmpPath)).toBe(true);
    
    const result = await manager.clear();
    
    expect(result.success).toBe(true);
    expect(existsSync(testTmpPath)).toBe(false);
  });

  test('should revert parameter to previous value', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    
    await manager.setParameter('redis', 'REDIS_URL', 'first_value');
    await manager.setParameter('redis', 'REDIS_URL', 'second_value');
    
    const param = manager.getParameter('redis', 'REDIS_URL')!;
    expect(param.getUserInputValue()).toBe('second_value');
    expect(param.getPreviousUserInputValue()).toBe('first_value');
    
    await manager.revertParameter('redis', 'REDIS_URL');
    
    const revertedParam = manager.getParameter('redis', 'REDIS_URL')!;
    expect(revertedParam.getUserInputValue()).toBe('first_value');
    expect(revertedParam.getPreviousUserInputValue()).toBe('');
  });

  test('should return error for non-existent parameter', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();

    const result = await manager.setParameter('redis', 'NONexistent', 'value');

    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
  });
});

describe('PartialConfigManager - serializeToToml (round-trip)', () => {
  const testConfigPath = './test-serial.toml';
  const testTmpPath = './test-serial.tmp';

  beforeEach(() => {
    const testConfig = `[components.postgres]
POSTGRES_HOST = {label="Postgres host", initialValue="localhost", userInputValue=""}
POSTGRES_PASSWORD = {label="Postgres password", initialValue="", userInputValue="", type="password"}
POSTGRES_PORT = {label="Postgres port", initialValue="5432", userInputValue="", isMandatory=true}
`;
    writeFileSync(testConfigPath, testConfig);
  });

  afterEach(() => {
    if (existsSync(testConfigPath)) unlinkSync(testConfigPath);
    if (existsSync(testTmpPath)) unlinkSync(testTmpPath);
  });

  test('should preserve type=password through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_PASSWORD', 'secret');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const param = manager2.getParameter('postgres', 'POSTGRES_PASSWORD')!;
    expect(param.getType()).toBe('password');
  });

  test('should preserve type=string through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_HOST', 'db.example.com');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const param = manager2.getParameter('postgres', 'POSTGRES_HOST')!;
    expect(param.getType()).toBe('string');
  });

  test('should preserve userInputValue for password parameter through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_PASSWORD', 'mysecret');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const param = manager2.getParameter('postgres', 'POSTGRES_PASSWORD')!;
    expect(param.getUserInputValue()).toBe('mysecret');
    expect(param.getType()).toBe('password');
  });

  test('should preserve isMandatory through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_PORT', '5433');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const param = manager2.getParameter('postgres', 'POSTGRES_PORT')!;
    expect(param.isMandatory()).toBe(true);
  });

  test('should preserve previousUserInputValue through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_PASSWORD', 'first');
    await manager.setParameter('postgres', 'POSTGRES_PASSWORD', 'second');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const param = manager2.getParameter('postgres', 'POSTGRES_PASSWORD')!;
    expect(param.getUserInputValue()).toBe('second');
    expect(param.getPreviousUserInputValue()).toBe('first');
    expect(param.getType()).toBe('password');
  });

  test('should preserve all fields for all parameters through save and reload', async () => {
    const manager = new PartialConfigManager(testConfigPath);
    await manager.load();
    await manager.setParameter('postgres', 'POSTGRES_HOST', 'db.example.com');
    await manager.setParameter('postgres', 'POSTGRES_PASSWORD', 'topsecret');

    const manager2 = new PartialConfigManager(testConfigPath);
    await manager2.load();

    const host = manager2.getParameter('postgres', 'POSTGRES_HOST')!;
    expect(host.getType()).toBe('string');
    expect(host.getUserInputValue()).toBe('db.example.com');
    expect(host.getLabel()).toBe('Postgres host');
    expect(host.getInitialValue()).toBe('localhost');

    const pw = manager2.getParameter('postgres', 'POSTGRES_PASSWORD')!;
    expect(pw.getType()).toBe('password');
    expect(pw.getUserInputValue()).toBe('topsecret');
    expect(pw.getLabel()).toBe('Postgres password');
  });
});


