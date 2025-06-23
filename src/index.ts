// Core types
export type {
  RadioConfigMetadata,
  RadioCapabilities,
  CodecConfig,
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

// Registry components
import type { RadioConfigRegistry } from './registry/config-registry.js';
import { NpmBasedConfigRegistry } from './registry/config-registry.js';

// Shared components
export type { SharedComponentManager } from '@springfield/ham-radio-api';
export { DefaultSharedComponentManager } from './registry/shared-components.js';

// NPM client
export type { NpmClient } from './utils/npm-client.js';
export { DefaultNpmClient } from './utils/npm-client.js';

// Factory function for creating registry instances
export function createRegistry(logger: any): RadioConfigRegistry {
  return new NpmBasedConfigRegistry(logger);
}
