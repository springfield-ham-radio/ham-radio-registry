import { describe, it } from 'node:test';
import { expect } from 'chai';
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

    expect(radio.id.model).to.equal('baofeng-uv5r');
    expect(radio.settingsSchema.settingsSchema).to.deep.equal(settingsSchemaDoc);
    expect(radio.settingsSchema.channelSchema).to.deep.equal(channelSchemaDoc);
    expect(radio.memoryMap).to.deep.equal(memoryMapDoc);
    expect(radio.metadata.author).to.equal('Springfield Ham Radio');
    expect(radio.metadata.moduleId).to.equal('');
  });

  it('should accept JSON text', () => {
    const radio = hydrateRadioConfig(JSON.stringify(baofengShapedConfig()), documentsByRef);
    expect(radio.id.name).to.equal('Baofeng UV-5R');
  });

  it('should throw when a $ref document is missing', () => {
    expect(() => hydrateRadioConfig(baofengShapedConfig(), {})).to.throw(/Missing document for \$ref/);
  });
});

describe('validateConfiguration', () => {
  it('should reject an empty configuration', () => {
    const result = validateConfiguration({} as RegistryRadio);
    expect(result.isValid).to.be.false;
    expect(result.errors).to.include('Configuration must have a valid model ID');
  });

  it('should accept a hydrated Baofeng-shaped configuration', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    const result = validateConfiguration(radio);
    expect(result.isValid).to.be.true;
    expect(result.errors).to.be.empty;
  });
});

describe('extractCatalogMetadata', () => {
  it('should extract catalog fields and content hash', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    const entry = extractCatalogMetadata(radio, 'bundled');

    expect(entry.modelId).to.equal('baofeng-uv5r');
    expect(entry.name).to.equal('Baofeng UV-5R');
    expect(entry.manufacturer).to.equal('Baofeng');
    expect(entry.version).to.equal('1.0.0');
    expect(entry.source).to.equal('bundled');
    expect(entry.capabilities.memoryRead).to.be.true;
    expect(entry.contentHash).to.equal(hashRadioConfig(radio));
    expect(entry.contentHash).to.match(/^[0-9a-f]{8}$/);
  });

  it('should use RadioModelId-compatible model strings', () => {
    const radio = hydrateRadioConfig(baofengShapedConfig(), documentsByRef);
    expect(radio.id.model).to.equal(RadioModelId('baofeng-uv5r'));
  });
});
