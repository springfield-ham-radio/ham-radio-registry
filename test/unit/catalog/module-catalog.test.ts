import { describe, expect, it } from 'vitest';
import {
  compareSemver,
  isApiVersionCompatible,
  parseModuleCatalog,
  validateModuleCatalog,
} from '../../../src/catalog/module-catalog.js';

const sampleCatalog = {
  schemaVersion: 3,
  modules: [
    {
      id: 'baofeng-uv5r',
      package: '@springfield/radio-module-baofeng-uv5r',
      manufacturer: 'Baofeng',
      name: 'Baofeng UV-5R',
      description: 'Baofeng UV-5R and UV-5RE Plus',
      version: '3.7.0',
      config: 'configs/baofeng-uv5r.json',
      minApiVersion: '18.0.1',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.7.2/radio-module-baofeng-uv5r-3.7.0.zip',
      integrity: 'sha256:6cacd7eeaf8922e4245c63419e7213c2453beaa0787963f31a9e0054b4c89ac7',
    },
    {
      id: 'kenwood-th-f6',
      package: '@springfield/radio-module-kenwood-th-f6',
      manufacturer: 'Kenwood',
      name: 'Kenwood TH-F6A',
      version: '1.11.0',
      config: 'configs/kenwood-th-f6.json',
      minApiVersion: '18.0.1',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-kenwood/releases/download/v1.12.0/radio-module-kenwood-th-f6-1.11.0.zip',
      integrity: 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    },
  ],
};

const legacyCatalogV1 = {
  schemaVersion: 1,
  modules: [
    {
      id: 'baofeng',
      package: '@springfield/radio-module-baofeng',
      manufacturer: 'Baofeng',
      version: '3.0.0',
      supportedRadios: ['uv5r'],
      minApiVersion: '17.3.0',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.0.0/radio-module-baofeng-3.0.0.zip',
      integrity: 'sha256:6cacd7eeaf8922e4245c63419e7213c2453beaa0787963f31a9e0054b4c89ac7',
    },
  ],
};

describe('module catalog', () => {
  it('should parse a schema version 3 catalog entry', () => {
    const catalog = parseModuleCatalog(JSON.stringify(sampleCatalog));

    expect(catalog.schemaVersion).toBe(3);
    expect(catalog.modules).toHaveLength(2);
    expect(catalog.modules[0]).toEqual({
      id: 'baofeng-uv5r',
      package: '@springfield/radio-module-baofeng-uv5r',
      manufacturer: 'Baofeng',
      name: 'Baofeng UV-5R',
      description: 'Baofeng UV-5R and UV-5RE Plus',
      version: '3.7.0',
      config: 'configs/baofeng-uv5r.json',
      minApiVersion: '18.0.1',
      downloadUrl:
        'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.7.2/radio-module-baofeng-uv5r-3.7.0.zip',
      integrity: 'sha256:6cacd7eeaf8922e4245c63419e7213c2453beaa0787963f31a9e0054b4c89ac7',
    });
    expect(catalog.modules[0]?.integrity).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('should reject schema versions 1 and 2 without field-level noise', () => {
    const v1 = validateModuleCatalog(legacyCatalogV1);
    expect(v1.isValid).toBe(false);
    expect(v1.errors).toEqual([
      'Unsupported schemaVersion 1: this registry accepts only schema version 3. Schema versions 1 and 2 are no longer supported.',
    ]);

    const v2 = validateModuleCatalog({ ...legacyCatalogV1, schemaVersion: 2 });
    expect(v2.isValid).toBe(false);
    expect(v2.errors).toEqual([
      'Unsupported schemaVersion 2: this registry accepts only schema version 3. Schema versions 1 and 2 are no longer supported.',
    ]);

    expect(() => parseModuleCatalog(JSON.stringify(legacyCatalogV1))).toThrow(
      /Unsupported schemaVersion 1: this registry accepts only schema version 3/,
    );
  });

  it('should reject legacy radios and supportedRadios fields', () => {
    const withRadios = {
      schemaVersion: 3,
      modules: [
        {
          ...sampleCatalog.modules[0],
          radios: [{ modelId: 'baofeng-uv5r', name: 'Baofeng UV-5R', config: 'configs/baofeng-uv5r.json' }],
        },
      ],
    };

    const result = validateModuleCatalog(withRadios);
    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toContain('radios is not supported in schema version 3');
  });

  it('should reject duplicate module ids', () => {
    const result = validateModuleCatalog({
      schemaVersion: 3,
      modules: [sampleCatalog.modules[0], sampleCatalog.modules[0]],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toContain('Duplicate module id: baofeng-uv5r');
  });

  it('should reject supportedRadios-only entries', () => {
    const result = validateModuleCatalog({
      schemaVersion: 3,
      modules: [
        {
          ...sampleCatalog.modules[0],
          supportedRadios: ['baofeng-uv5r'],
        },
      ],
    });

    expect(result.isValid).toBe(false);
    expect(result.errors.join(' ')).toContain('supportedRadios is not supported in schema version 3');
  });

  it('should require package, config, and asset name to match id and version', () => {
    const [radio] = sampleCatalog.modules;

    const wrongPackage = validateModuleCatalog({
      schemaVersion: 3,
      modules: [{ ...radio, package: '@springfield/radio-module-baofeng' }],
    });
    expect(wrongPackage.isValid).toBe(false);
    expect(wrongPackage.errors.join(' ')).toContain('package must be @springfield/radio-module-baofeng-uv5r');

    const wrongConfig = validateModuleCatalog({
      schemaVersion: 3,
      modules: [{ ...radio, config: 'configs/uv5r.json' }],
    });
    expect(wrongConfig.isValid).toBe(false);
    expect(wrongConfig.errors.join(' ')).toContain('config must be configs/baofeng-uv5r.json');

    const combinedZip = validateModuleCatalog({
      schemaVersion: 3,
      modules: [
        {
          ...radio,
          downloadUrl:
            'https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.7.2/radio-module-baofeng-3.7.2.zip',
        },
      ],
    });
    expect(combinedZip.isValid).toBe(false);
    expect(combinedZip.errors.join(' ')).toContain(
      'downloadUrl must name the asset radio-module-baofeng-uv5r-3.7.0.zip',
    );
  });

  it('should reject retired and short ids', () => {
    const [radio] = sampleCatalog.modules;

    for (const id of ['baofeng', 'uv5r']) {
      const result = validateModuleCatalog({
        schemaVersion: 3,
        modules: [{ ...radio, id }],
      });

      expect(result.isValid).toBe(false);
      expect(result.errors.join(' ')).toContain(`${id}`);
      expect(result.errors.join(' ')).toContain('model id like baofeng-uv5r');
    }
  });

  it('should reject non-semver version and minApiVersion', () => {
    const [radio] = sampleCatalog.modules;

    const version = validateModuleCatalog({
      schemaVersion: 3,
      modules: [{ ...radio, version: 'v3.7.0' }],
    });
    expect(version.isValid).toBe(false);
    expect(version.errors.join(' ')).toContain('version must be a major.minor.patch semver');

    const minApi = validateModuleCatalog({
      schemaVersion: 3,
      modules: [{ ...radio, minApiVersion: '18.0' }],
    });
    expect(minApi.isValid).toBe(false);
    expect(minApi.errors.join(' ')).toContain('minApiVersion must be a major.minor.patch semver');
  });

  it('should reject invalid catalogs', () => {
    const result = validateModuleCatalog({ schemaVersion: 99, modules: [] });

    expect(result.isValid).toBe(false);
    expect(result.errors).toEqual(['Unsupported schemaVersion: expected schema version 3']);
  });

  it('should compare api versions', () => {
    expect(compareSemver('17.3.0', '17.3.0')).toBe(0);
    expect(isApiVersionCompatible('17.3.0', '17.3.0')).toBe(true);
    expect(isApiVersionCompatible('17.2.0', '17.3.0')).toBe(false);
    expect(isApiVersionCompatible('18.0.0', '17.3.0')).toBe(true);
  });
});
