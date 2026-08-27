import { describe, it } from 'node:test';
import { expect } from 'chai';
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
  it('should parse a valid catalog', () => {
    const catalog = parseModuleCatalog(JSON.stringify(sampleCatalog));

    expect(catalog.schemaVersion).to.equal(1);
    expect(catalog.modules).to.have.length(1);
    expect(catalog.modules[0]?.id).to.equal('baofeng');
    expect(catalog.modules[0]?.integrity).to.match(/^sha256:[a-f0-9]{64}$/);
  });

  it('should reject invalid catalogs', () => {
    const result = validateModuleCatalog({ schemaVersion: 99, modules: [] });

    expect(result.isValid).to.be.false;
    expect(result.errors.join(' ')).to.include('schemaVersion');
  });

  it('should compare api versions', () => {
    expect(compareSemver('17.3.0', '17.3.0')).to.equal(0);
    expect(isApiVersionCompatible('17.3.0', '17.3.0')).to.be.true;
    expect(isApiVersionCompatible('17.2.0', '17.3.0')).to.be.false;
    expect(isApiVersionCompatible('18.0.0', '17.3.0')).to.be.true;
  });
});
