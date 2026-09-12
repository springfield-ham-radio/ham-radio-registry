import type { RadioCatalogEntry, RadioCatalogSource, RadioCapabilities, RegistryRadio } from '../types/radio-config.js';
import { hashRadioConfig } from './content-hash.js';

const DEFAULT_CAPABILITIES: RadioCapabilities = {
  memoryRead: false,
  memoryWrite: false,
  channelProgramming: false,
  settingsProgramming: false,
  liveControl: false,
};

/**
 * Extract lightweight catalog metadata from a hydrated radio config.
 */
export function extractCatalogMetadata(
  radio: RegistryRadio,
  source: RadioCatalogSource = 'user',
  contentHash?: string,
): RadioCatalogEntry {
  const capabilities: RadioCapabilities = {
    memoryRead: radio.capabilities?.memoryRead ?? DEFAULT_CAPABILITIES.memoryRead,
    memoryWrite: radio.capabilities?.memoryWrite ?? DEFAULT_CAPABILITIES.memoryWrite,
    channelProgramming: radio.capabilities?.channelProgramming ?? DEFAULT_CAPABILITIES.channelProgramming,
    settingsProgramming: radio.capabilities?.settingsProgramming ?? DEFAULT_CAPABILITIES.settingsProgramming,
    liveControl: radio.capabilities?.liveControl ?? DEFAULT_CAPABILITIES.liveControl,
  };

  return {
    modelId: radio.id.model,
    name: radio.id.name,
    manufacturer: radio.id.manufacturer,
    version: radio.version,
    description: radio.description,
    capabilities,
    source,
    contentHash: contentHash ?? hashRadioConfig(radio),
  };
}
