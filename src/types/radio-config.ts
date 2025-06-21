import type { RadioModelId } from '@springfield/ham-radio-api';

/**
 * Radio configuration metadata
 */
export interface RadioConfigId {
  model: RadioModelId;
  name: string;
  manufacturer: string;
}

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
 * Serial configuration for radio communication
 */
export interface SerialConfig {
  baudRate: number;
  dataBits: number;
  stopBits: number;
  parity: 'none' | 'even' | 'odd';
}

/**
 * Memory segment configuration
 */
export interface MemorySegment {
  startAddress: number;
  endAddress: number;
  description?: string;
}

/**
 * Memory configuration
 */
export interface MemoryConfig {
  chunkSize: number;
  segments: Record<string, MemorySegment>;
}

/**
 * Protocol step for send/receive operations
 */
export interface SendReceiveStep {
  sendReceive: {
    send: (number | string)[];
    receive: {
      type: 'exact' | 'variable' | 'pattern';
      value?: number;
      length?: number;
      pattern?: any[];
    };
    description: string;
  };
}

/**
 * Protocol step for reading memory segments
 */
export interface ReadSegmentStep {
  readSegment: {
    segments: string[];
    startChunk: {
      send: (number | string)[];
      receive: {
        type: 'exact' | 'variable' | 'pattern';
        value?: number;
        length?: number;
        pattern?: any[];
      };
    };
    endChunk: {
      send: (number | string)[];
      receive: {
        type: 'exact' | 'variable' | 'pattern';
        value?: number;
        length?: number;
        pattern?: any[];
      };
    };
    description: string;
  };
}

/**
 * Protocol step for writing memory segments
 */
export interface WriteSegmentStep {
  writeSegment: {
    segments: string[];
    send: (number | string)[];
    data: string;
    receive: {
      type: 'exact' | 'variable' | 'pattern';
      value?: number;
      length?: number;
      pattern?: any[];
    };
    description: string;
  };
}

/**
 * Protocol step types
 */
export type ProtocolStep = SendReceiveStep | ReadSegmentStep | WriteSegmentStep;

/**
 * Settings schema configuration
 */
export interface SettingsSchema {
  model: RadioModelId;
  settingsSchema: Record<string, any> | { $ref: string };
  channelSchema: Record<string, any> | { $ref: string };
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
 * Complete radio configuration
 */
export interface RadioConfiguration {
  $schema?: string;
  id: RadioConfigId;
  version: string;
  description: string;
  capabilities: RadioCapabilities;
  serialConfig: SerialConfig;
  memoryConfig: MemoryConfig;
  readMemory: ProtocolStep[];
  writeMemory: ProtocolStep[];
  settingsSchema: SettingsSchema;
  codec?: CodecConfig;
  metadata: RadioConfigMetadata;
}

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
