import type { CatalogValidationResult, RadioModuleCatalog, RadioModuleCatalogEntry } from '../types/module-catalog.js';

const INTEGRITY_PATTERN = /^sha256:[a-fA-F0-9]{64}$/;
const CONFIG_PATH_PATTERN = /^configs\/[^/]+\.json$/;
const SUPPORTED_SCHEMA_VERSION = 3;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isHttpsUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:';
  } catch {
    return false;
  }
}

function validateModuleEntry(entry: unknown, index: number, errors: string[]): RadioModuleCatalogEntry | undefined {
  if (!isRecord(entry)) {
    errors.push(`modules[${index}] must be an object`);
    return undefined;
  }

  const prefix = `modules[${index}]`;

  if (entry.radios !== undefined) {
    errors.push(`${prefix}.radios is not supported in schema version 3`);
  }

  if (entry.supportedRadios !== undefined) {
    errors.push(`${prefix}.supportedRadios is not supported in schema version 3`);
  }

  if (!isNonEmptyString(entry.id)) {
    errors.push(`${prefix}.id is required`);
  }

  if (!isNonEmptyString(entry.package)) {
    errors.push(`${prefix}.package is required`);
  }

  if (!isNonEmptyString(entry.manufacturer)) {
    errors.push(`${prefix}.manufacturer is required`);
  }

  if (!isNonEmptyString(entry.name)) {
    errors.push(`${prefix}.name is required`);
  }

  if (!isNonEmptyString(entry.version)) {
    errors.push(`${prefix}.version is required`);
  }

  if (!isNonEmptyString(entry.config) || !CONFIG_PATH_PATTERN.test(entry.config)) {
    errors.push(`${prefix}.config must be a configs/*.json path`);
  }

  if (!isNonEmptyString(entry.minApiVersion)) {
    errors.push(`${prefix}.minApiVersion is required`);
  }

  if (!isNonEmptyString(entry.downloadUrl) || !isHttpsUrl(entry.downloadUrl)) {
    errors.push(`${prefix}.downloadUrl must be an https URL`);
  }

  if (!isNonEmptyString(entry.integrity) || !INTEGRITY_PATTERN.test(entry.integrity)) {
    errors.push(`${prefix}.integrity must match sha256:<64 hex chars>`);
  }

  if (entry.description !== undefined && typeof entry.description !== 'string') {
    errors.push(`${prefix}.description must be a string when present`);
  }

  if (errors.some((error) => error.startsWith(prefix))) {
    return undefined;
  }

  return {
    id: entry.id as string,
    package: entry.package as string,
    manufacturer: entry.manufacturer as string,
    name: entry.name as string,
    ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
    version: entry.version as string,
    config: entry.config as string,
    minApiVersion: entry.minApiVersion as string,
    downloadUrl: entry.downloadUrl as string,
    integrity: (entry.integrity as string).toLowerCase(),
  };
}

/**
 * Validate and normalize a catalog.json document.
 */
export function validateModuleCatalog(value: unknown): CatalogValidationResult & { catalog?: RadioModuleCatalog } {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(value)) {
    return { isValid: false, errors: ['Catalog must be a JSON object'], warnings };
  }

  if (typeof value.schemaVersion !== 'number' || value.schemaVersion !== SUPPORTED_SCHEMA_VERSION) {
    if (value.schemaVersion === 1 || value.schemaVersion === 2) {
      errors.push(
        `Unsupported schemaVersion: ${value.schemaVersion} is no longer supported; expected schema version ${SUPPORTED_SCHEMA_VERSION}`,
      );
    } else {
      errors.push(`Unsupported schemaVersion: expected ${SUPPORTED_SCHEMA_VERSION}`);
    }
  }

  if (!Array.isArray(value.modules)) {
    errors.push('modules must be an array');
    return { isValid: false, errors, warnings };
  }

  const modules: RadioModuleCatalogEntry[] = [];
  const seenIds = new Set<string>();

  for (let index = 0; index < value.modules.length; index += 1) {
    const entry = validateModuleEntry(value.modules[index], index, errors);

    if (!entry) {
      continue;
    }

    if (seenIds.has(entry.id)) {
      errors.push(`Duplicate module id: ${entry.id}`);
      continue;
    }

    seenIds.add(entry.id);
    modules.push(entry);
  }

  if (errors.length > 0) {
    return { isValid: false, errors, warnings };
  }

  return {
    isValid: true,
    errors,
    warnings,
    catalog: {
      schemaVersion: SUPPORTED_SCHEMA_VERSION,
      modules,
    },
  };
}

/**
 * Parse catalog JSON text and validate it.
 */
export function parseModuleCatalog(json: string): RadioModuleCatalog {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON';
    throw new Error(`Failed to parse module catalog: ${message}`);
  }

  const result = validateModuleCatalog(parsed);

  if (!result.isValid || !result.catalog) {
    throw new Error(`Invalid module catalog: ${result.errors.join(', ')}`);
  }

  return result.catalog;
}

/**
 * Compare dotted semver-like versions. Returns negative if left < right, 0 if equal, positive if left > right.
 */
export function compareSemver(left: string, right: string): number {
  const leftParts = left.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const rightParts = right.split('.').map((part) => Number.parseInt(part, 10) || 0);
  const length = Math.max(leftParts.length, rightParts.length);

  for (let index = 0; index < length; index += 1) {
    const leftValue = leftParts[index] ?? 0;
    const rightValue = rightParts[index] ?? 0;

    if (leftValue !== rightValue) {
      return leftValue - rightValue;
    }
  }

  return 0;
}

/**
 * True when the installed API version satisfies the module's minimum.
 */
export function isApiVersionCompatible(installedApiVersion: string, minApiVersion: string): boolean {
  return compareSemver(installedApiVersion, minApiVersion) >= 0;
}

/**
 * Normalize integrity strings for comparison (lowercase hex).
 */
export function normalizeIntegrity(integrity: string): string {
  return integrity.trim().toLowerCase();
}

/**
 * Build a sha256 integrity string from a hex digest.
 */
export function integrityFromSha256Hex(hex: string): string {
  return `sha256:${hex.trim().toLowerCase()}`;
}
