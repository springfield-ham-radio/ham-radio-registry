import type { ValidationResult } from '@springfield/ham-radio-api';
import type { RegistryRadio } from '../types/radio-config.js';

/**
 * Validate a radio configuration for catalog ingest and registry use.
 */
export function validateConfiguration(config: RegistryRadio): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!config.id?.model) {
    errors.push('Configuration must have a valid model ID');
  }

  if (!config.serialConfig) {
    errors.push('Configuration must have serial configuration');
  }

  if (!config.memoryConfig) {
    errors.push('Configuration must have memory configuration');
  }

  if (!config.readMemory || config.readMemory.length === 0) {
    errors.push('Configuration must have read memory protocol');
  }

  if (!config.writeMemory || config.writeMemory.length === 0) {
    errors.push('Configuration must have write memory protocol');
  }

  if (!config.settingsSchema) {
    errors.push('Configuration must have settings schema');
  }

  return {
    errors,
    isValid: errors.length === 0,
    warnings,
  };
}
