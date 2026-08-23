// Core types
export type {
  RadioConfigMetadata,
  RadioCapabilities,
  CodecConfig,
  RegistryRadio,
  RadioCatalogEntry,
  RadioCatalogSource,
} from './types/radio-config.js';

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
} from './catalog/index.js';
