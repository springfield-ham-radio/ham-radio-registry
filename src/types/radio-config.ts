import type { Radio } from '@springfield/ham-radio-api';

/**
 * Radio configuration metadata
 */
export interface RadioConfigMetadata {
  moduleId: string;
  moduleVersion: string;
  lastUpdated: string;
  author: string;
  license: string;
  pluginPath?: string;
}

/**
 * Radio capabilities
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
  type: 'shared' | 'inline';
  reference?: string;
  config?: Record<string, any>;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface RegistryRadio extends Radio {
  $schema?: string;
  capabilities: RadioCapabilities;
  codec?: CodecConfig;
  metadata: RadioConfigMetadata;
}
