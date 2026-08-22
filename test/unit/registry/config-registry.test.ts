import type { RegistryRadio } from '../../../src/types/radio-config.js';
import { RadioModelId } from '@springfield/ham-radio-api';
import { describe, it } from 'node:test';
import { expect } from 'chai';
import { NpmBasedConfigRegistry } from '../../../src/registry/config-registry.js';
import { MockLogLayer } from 'loglayer';

const mockLogger = new MockLogLayer();

describe('NpmBasedConfigRegistry', () => {
  it('should instantiate without error', () => {
    const registry = new NpmBasedConfigRegistry(mockLogger);
    expect(registry).to.be.an('object');
  });

  it('should have core methods', () => {
    const registry = new NpmBasedConfigRegistry(mockLogger);
    expect(registry.discoverConfigurations).to.be.a('function');
    expect(registry.getConfiguration).to.be.a('function');
    expect(registry.validateConfiguration).to.be.a('function');
    expect(registry.registerConfiguration).to.be.a('function');
    expect(registry.installPlugin).to.be.a('function');
    expect(registry.listInstalledPlugins).to.be.a('function');
    expect(registry.getCodec).to.be.a('function');
  });

  it('should validate a minimal invalid configuration', () => {
    const registry = new NpmBasedConfigRegistry(mockLogger);
    const invalidConfig = {} as RegistryRadio;
    const result = registry.validateConfiguration(invalidConfig);
    expect(result.isValid).to.be.false;
    expect(result.errors).to.include('Configuration must have a valid model ID');
  });

  it('should validate a minimal valid configuration', () => {
    const registry = new NpmBasedConfigRegistry(mockLogger);
    const validConfig = {
      id: { model: RadioModelId('test-model'), name: 'Test', manufacturer: 'TestCo' },
      version: '1.0.0',
      description: 'Test config',
      capabilities: {
        memoryRead: true,
        memoryWrite: true,
        channelProgramming: true,
        settingsProgramming: true,
      },
      serialConfig: {
        baudRate: 9600,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
      },
      memoryConfig: {
        chunkSize: 64,
        segments: {
          channels: { startAddress: 0, endAddress: 100 },
        },
      },
      readMemory: [{ description: 'desc', send: [1], expect: 1 }],
      writeMemory: [{ description: 'desc', send: [1], expect: 1 }],
      settingsSchema: {
        model: RadioModelId('test-model'),
        settingsSchema: {},
        channelSchema: {},
      },
      metadata: {
        moduleId: 'test-module',
        moduleVersion: '1.0.0',
        lastUpdated: new Date().toISOString(),
        author: 'Test',
        license: 'MIT',
      },
    } as RegistryRadio;
    const result = registry.validateConfiguration(validConfig);
    expect(result.isValid).to.be.true;
    expect(result.errors).to.be.empty;
  });
});
