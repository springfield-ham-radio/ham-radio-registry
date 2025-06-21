// Core types
export type {
  RadioConfiguration,
  RadioConfigId,
  RadioConfigMetadata,
  RadioCapabilities,
  SerialConfig,
  MemoryConfig,
  MemorySegment,
  ProtocolStep,
  SendReceiveStep,
  ReadSegmentStep,
  WriteSegmentStep,
  SettingsSchema,
  CodecConfig,
  ValidationResult,
} from './types/radio-config.js';

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
export type { SharedComponentManager } from './registry/shared-components.js';
export { DefaultSharedComponentManager } from './registry/shared-components.js';

// NPM client
export type { NpmClient } from './utils/npm-client.js';
export { DefaultNpmClient } from './utils/npm-client.js';

// Factory function for creating registry instances
export function createRegistry(logger: any): RadioConfigRegistry {
  return new NpmBasedConfigRegistry(logger);
}
