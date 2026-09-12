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
  /**
   * Live VFO / mode / PTT on the programming PC port.
   * Independent of memory protocol: a radio may clone EEPROM and still speak CAT.
   */
  liveControl: boolean;
}

/**
 * How live control talks on the PC port. Present when `capabilities.liveControl` is true.
 *
 * Kenwood command layout, mode names, and power labels belong here so HamBench
 * does not special-case radio models.
 */
export interface RadioCatConfig {
  /** Command family, for example `kenwood`. */
  protocol: string;
  /** Send a wake CR and discard buffered replies before `ID`. */
  wakeCr?: boolean;
  /** How many VFOs to poll. Default 1. */
  vfoCount?: number;
  /** Frequency commands to try in order, for example `["FQ","FO"]` or `["FO"]`. */
  frequencyCommands?: string[];
  /** Digit width of the frequency field. Kenwood handhelds use 11; TM-D710 `FO` uses 10. */
  frequencyWidth?: number;
  /**
   * When true, the frequency command is a multi-field VFO channel (`FO n` → 13 fields).
   * Mode is the last field. There is no separate `MD` command.
   */
  vfoChannel?: boolean;
  /** Mode names in CAT code order. */
  modes?: string[];
  /** Power names in CAT code order, as shown on the radio. */
  powers?: string[];
  /** Separate mode command, for example `MD`. Omit when `vfoChannel` is true. */
  modeCommand?: string;
  /** Pass the band index to `PC` (`PC n` / `PC n,x`). */
  powerBandIndex?: boolean;
  /** Read `BC` (no args) for CTRL/PTT band. */
  bandControl?: boolean;
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
  cat?: RadioCatConfig;
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
