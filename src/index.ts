// Core types
export type {
  RadioConfigMetadata,
  RadioCapabilities,
  RadioCatConfig,
  CodecConfig,
  RegistryRadio,
  RadioCatalogEntry,
  RadioCatalogSource,
} from './types/radio-config.js';

export type {
  RadioModuleCatalog,
  RadioModuleCatalogEntry,
  RadioModuleCatalogRadio,
  CatalogValidationResult,
} from './types/module-catalog.js';

// Re-export common types from ham-radio-api
export type { ValidationResult } from '@springfield/ham-radio-api';

export type {
  PluginModule,
  PluginCapabilities,
  SpringfieldPluginConfig,
  NpmPluginInfo,
  PluginManifest,
  PluginManifestConfiguration,
  PluginSharedComponents,
  PluginSecurity,
} from './types/plugin-module.js';

// Browser-safe catalog API (no node:fs)
export {
  hydrateRadioConfig,
  extractCatalogMetadata,
  validateConfiguration,
  computeContentHash,
  hashRadioConfig,
  validateModuleCatalog,
  parseModuleCatalog,
  compareSemver,
  isApiVersionCompatible,
  normalizeIntegrity,
  integrityFromSha256Hex,
} from './catalog/index.js';
