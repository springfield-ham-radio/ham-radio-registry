/**
 * Node.js entry — npm/fs plugin discovery. Import from `@springfield/ham-radio-registry/node`.
 */

export type { RadioConfigRegistry } from './registry/config-registry.js';
export { NpmBasedConfigRegistry } from './registry/config-registry.js';

export type { SharedComponentManager } from '@springfield/ham-radio-api';
export { DefaultSharedComponentManager } from './registry/shared-components.js';

export type { NpmClient } from './utils/npm-client.js';
export { DefaultNpmClient } from './utils/npm-client.js';

import { NpmBasedConfigRegistry, type RadioConfigRegistry } from './registry/config-registry.js';
import type { ILogLayer } from 'loglayer';

/**
 * Create an npm-based radio configuration registry (Node.js only).
 */
export function createRegistry(logger: ILogLayer): RadioConfigRegistry {
  return new NpmBasedConfigRegistry(logger);
}

// Re-export browser-safe catalog API for convenience
export * from './index.js';
