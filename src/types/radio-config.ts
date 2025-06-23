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
 * Radio capabilities
 */
export interface RadioCapabilities {
  dslProtocols: boolean;
  customCodecs: boolean;
  memoryRead: boolean;
  memoryWrite: boolean;
  sharedComponents: boolean;
}

/**
 * Codec configuration
 */
export interface CodecConfig {
  type: 'shared' | 'inline';
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
