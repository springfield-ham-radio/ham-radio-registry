import { describe, expect, it } from 'vitest';
import { RadioModelId } from '@springfield/ham-radio-api';
import {
  extractCatalogMetadata,
  hashRadioConfig,
  hydrateRadioConfig,
  validateConfiguration,
} from '../../../src/catalog/index.js';
import type { RegistryRadio } from '../../../src/types/radio-config.js';

const settingsSchemaDoc = {
  type: 'object',
  properties: { squelch: { type: 'integer' } },
};

const channelSchemaDoc = {
  type: 'object',
  properties: { power: { type: 'integer' } },
};

const memoryMapDoc = {
  version: '1.0.0',
  description: 'test map',
  structs: [],
};

function baofengShapedConfig(): Record<string, unknown> {
  return {
    id: {
      model: 'baofeng-uv5r',
      name: 'Baofeng UV-5R',
      manufacturer: 'Baofeng',
    },
    version: '1.0.0',
    description: 'UV-5R and UV-5RE Plus models',
    capabilities: {
      memoryRead: true,
      memoryWrite: true,
      channelProgramming: true,
      settingsProgramming: true,
    },
    metadata: {
      author: 'Springfield Ham Radio',
      license: 'MIT',
    },
    settingsSchema: {
      model: 'baofeng-uv5r',
      settingsSchema: {
        $ref: '../src/shared/schemas/settings-schema.json',
      },
      channelSchema: {
        $ref: '../src/shared/schemas/channel-schema.json',
      },
    },
    memoryMap: {
      $ref: '../src/shared/memory-maps/uv5r-settings.json',
    },
    codec: {
      type: 'shared',
      reference: '../dist/codec-factory.js',
      config: { numberChannels: 128 },
    },
    serialConfig: {
      baudRate: 9600,
      dataBits: 8,
      stopBits: 1,
      parity: 'none',
    },
    memoryConfig: {
      chunkSize: 64,
      addressSize: 2,
      addressEndianness: 'big',
      segments: {
        channels: { startAddress: 0, endAddress: 6143 },
        settings: { startAddress: 7872, endAddress: 8191 },
      },
    },
    readMemory: [{ description: 'Send magic', send: ['0x50'], expect: '0x06' }],
    writeMemory: [{ description: 'Send magic', send: ['0x50'], expect: '0x06' }],
  };
}

const documentsByRef: Record<string, unknown> = {
  '../src/shared/schemas/settings-schema.json': settingsSchemaDoc,
  '../src/shared/schemas/channel-schema.json': channelSchemaDoc,
  '../src/shared/memory-maps/uv5r-settings.json': memoryMapDoc,
};

describe('hydrateRadioConfig', () => {
  it('should inline schema and memoryMap $ref documents', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);

    expect(radio.id.model).toBe('baofeng-uv5r');
    expect(radio.settingsSchema.settingsSchema).toEqual(settingsSchemaDoc);
    expect(radio.settingsSchema.channelSchema).toEqual(channelSchemaDoc);
    expect(radio.memoryMap).toEqual(memoryMapDoc);
    expect(radio.metadata.author).toBe('Springfield Ham Radio');
    expect(radio.metadata.moduleId).toBe('');
  });

  it('should accept JSON text', () => {
    const radio = hydrateRadioConfig(JSON.stringify(baofengShapedConfig()), documentsByRef);
    expect(radio.id.name).toBe('Baofeng UV-5R');
  });

  it('should throw when a $ref document is missing', () => {
    expect(() => hydrateRadioConfig(baofengShapedConfig(), {})).toThrow(/Missing document for \$ref/);
  });
});

describe('validateConfiguration', () => {
  it('should reject an empty configuration', () => {
    const result = validateConfiguration({} as RegistryRadio);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain('Configuration must have a valid model ID');
  });

  it('should accept a hydrated Baofeng-shaped configuration', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    const result = validateConfiguration(radio);
    expect(result.isValid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});

describe('extractCatalogMetadata', () => {
  it('should extract catalog fields and content hash', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    const entry = extractCatalogMetadata(radio, 'bundled');

    expect(entry.modelId).toBe('baofeng-uv5r');
    expect(entry.name).toBe('Baofeng UV-5R');
    expect(entry.manufacturer).toBe('Baofeng');
    expect(entry.version).toBe('1.0.0');
    expect(entry.source).toBe('bundled');
    expect(entry.capabilities.memoryRead).toBe(true);
    expect(entry.capabilities.liveControl).toBe(false);
    expect(entry.contentHash).toBe(hashRadioConfig(radio));
    expect(entry.contentHash).toMatch(/^[0-9a-f]{8}$/);
  });

  it('should copy liveControl when the radio declares it', () => {
    const raw = baofengShapedConfig();
    (raw.capabilities as Record<string, boolean>).liveControl = true;
    raw.cat = { protocol: 'kenwood', vfoCount: 2, powers: ['High', 'Medium', 'Low'] };
    const radio = hydrateRadioConfig(raw, documentsByRef);
    const entry = extractCatalogMetadata(radio, 'bundled');

    expect(entry.capabilities.liveControl).toBe(true);
    expect(radio.cat).toEqual({ protocol: 'kenwood', vfoCount: 2, powers: ['High', 'Medium', 'Low'] });
  });

  it('should use RadioModelId-compatible model strings', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    expect(radio.id.model).toBe(RadioModelId('baofeng-uv5r'));
  });
});
