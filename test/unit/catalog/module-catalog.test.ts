import { describe, expect, it } from 'vitest';
import {
  compareSemver,
  isApiVersionCompatible,
  parseModuleCatalog,
  validateModuleCatalog,
} from '../../../src/catalog/module-catalog.js';

const sampleCatalog = {
  schemaVersion: 1,
  modules: [
    {
      id: 'baofeng',
      package: '@springfield/radio-module-baofeng',
      manufacturer: 'Baofeng',
      description: 'Baofeng UV-5R series',
      version: '3.4.1',
      radios: [
        {
          modelId: 'baofeng-uv5r',
          name: 'Baofeng UV-5R',
          config: 'configs/baofeng-uv5r.json',
        },
      ],
      supportedRadios: ['baofeng-uv5r'],
      minApiVersion: '17.3.0',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.4.1/radio-module-baofeng-3.4.1.zip',
      integrity: 'sha256:6cacd7eeaf8922e4245c63419e7213c2453beaa0787963f31a9e0054b4c89ac7',
    },
  ],
};

const legacyCatalog = {
  schemaVersion: 1,
  modules: [
    {
      id: 'baofeng',
      package: '@springfield/radio-module-baofeng',
      manufacturer: 'Baofeng',
      version: '3.0.0',
      supportedRadios: ['uv5r', 'uv5r-plus'],
      minApiVersion: '17.3.0',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.0.0/radio-module-baofeng-3.0.0.zip',
      integrity: 'sha256:6cacd7eeaf8922e4245c63419e7213c2453beaa0787963f31a9e0054b4c89ac7',
    },
  ],
};

describe('module catalog', () => {
  it('should parse a catalog that lists real zip configs', () => {
    const catalog = parseModuleCatalog(JSON.stringify(sampleCatalog));

    expect(catalog.schemaVersion).toBe(1);
    expect(catalog.modules).toHaveLength(1);
    expect(catalog.modules[0]?.id).toBe('baofeng');
    expect(catalog.modules[0]?.radios).toEqual([
      {
        modelId: 'baofeng-uv5r',
        name: 'Baofeng UV-5R',
        config: 'configs/baofeng-uv5r.json',
      },
    ]);
    expect(catalog.modules[0]?.supportedRadios).toEqual(['baofeng-uv5r']);
    expect(catalog.modules[0]?.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should derive radios from legacy supportedRadios', () => {
    const catalog = parseModuleCatalog(JSON.stringify(legacyCatalog));

    expect(catalog.modules[0]?.supportedRadios).toEqual(['uv5r', 'uv5r-plus']);
    expect(catalog.modules[0]?.radios).toEqual([
      { modelId: 'uv5r', name: 'uv5r' },
      { modelId: 'uv5r-plus', name: 'uv5r-plus' },
    ]);
  });

  it('should derive supportedRadios from radios when omitted', () => {
    const withoutSupported = {
      ...sampleCatalog,
      modules: [
        {
          ...sampleCatalog.modules[0],
          supportedRadios: undefined,
        },
      ],
    };
    delete (withoutSupported.modules[0] as { supportedRadios?: string[] }).supportedRadios;

    const catalog = parseModuleCatalog(JSON.stringify(withoutSupported));

    expect(catalog.modules[0]?.supportedRadios).toEqual(['baofeng-uv5r']);
  });

  it('should reject radios that do not match supportedRadios', () => {
    const result = validateModuleCatalog({
      ...sampleCatalog,
      modules: [
        {
          ...sampleCatalog.modules[0],
          supportedRadios: ['uv5r-plus'],
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toContain('supportedRadios must match radios[].modelId');
  });

  it('should reject invalid catalogs', () => {
    const result = validateModuleCatalog({ schemaVersion: 99, modules: [] });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toContain('schemaVersion');
  });

  it('should compare api versions', () => {
    expect(compareSemver('17.3.0', '17.3.0')).toBe(0);
    expect(isApiVersionCompatible('17.3.0', '17.3.0')).toBe(true);
    expect(isApiVersionCompatible('17.2.0', '17.3.0')).toBe(false);
    expect(isApiVersionCompatible('18.0.0', '17.3.0')).toBe(true);
  });
});
