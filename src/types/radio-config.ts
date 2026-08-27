import type { Radio } from '@springfield/ham-radio-api';

/**
 * Radio configuration metadata
 */
export interface RadioConfigMetadata {
  moduleId: string;
  moduleVersion: string;
  pluginPath: string;
  lastUpdated?: string;
  author?: string;
  license?: string;
}

/**
 * Radio capabilities (matches radio-module JSON configs)
 */
export interface RadioCapabilities {
  memoryRead: boolean;
  memoryWrite: boolean;
  channelProgramming: boolean;
  settingsProgramming: boolean;
}

/**
 * Codec configuration
 */
export interface CodecConfig {
  type: 'shared' | 'inline' | 'memoryMap';
  reference?: string;
  config?: Record<string, unknown>;
}

/**
 * Registry radio configuration
 */
export interface RegistryRadio extends Radio {
  $schema?: string;
  capabilities: RadioCapabilities;
  codec?: CodecConfig;
  metadata: RadioConfigMetadata;
}

/**
 * Source of a catalogued radio configuration
 */
export type RadioCatalogSource = 'bundled' | 'installed' | 'user';

/**
 * Lightweight catalog metadata for listing radios (e.g. import dialog)
 */
export interface RadioCatalogEntry {
  modelId: string;
  name: string;
  manufacturer: string;
  version: string;
  description: string;
  capabilities: RadioCapabilities;
  source: RadioCatalogSource;
  contentHash: string;
}
