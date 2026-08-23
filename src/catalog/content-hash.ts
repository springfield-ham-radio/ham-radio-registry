/**
 * Stable FNV-1a 32-bit hash of a string (browser- and Node-safe, sync).
 */
export function computeContentHash(value: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

/**
 * Hash a resolved radio config for catalog change detection.
 */
export function hashRadioConfig(config: unknown): string {
  return computeContentHash(JSON.stringify(config));
}
