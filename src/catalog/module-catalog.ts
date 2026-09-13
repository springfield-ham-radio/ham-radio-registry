import type {
  CatalogValidationResult,
  RadioModuleCatalog,
  RadioModuleCatalogEntry,
  RadioModuleCatalogRadio,
} from '../types/module-catalog.js';

const INTEGRITY_PATTERN = /^sha256:[a-fA-F0-9]{64}$/;
const CONFIG_PATH_PATTERN = /^configs\/[^/]+\.json$/;
const SUPPORTED_SCHEMA_VERSIONS = new Set([1, 2]);

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

function sameStringSet(left: string[], right: string[]): boolean {
  if (left.length !== right.length) {
    return false;
  }

  const rightSet = new Set(right);
  return left.every((value) => rightSet.has(value));
}

function validateCatalogRadio(
  value: unknown,
  prefix: string,
  errors: string[],
  seenModelIds: Set<string>,
  seenConfigs: Set<string>,
): RadioModuleCatalogRadio | undefined {
  if (!isRecord(value)) {
    errors.push(`${prefix} must be an object`);
    return undefined;
  }

  if (!isNonEmptyString(value.modelId)) {
    errors.push(`${prefix}.modelId is required`);
  }

  if (!isNonEmptyString(value.name)) {
    errors.push(`${prefix}.name is required`);
  }

  if (value.config !== undefined) {
    if (!isNonEmptyString(value.config) || !CONFIG_PATH_PATTERN.test(value.config)) {
      errors.push(`${prefix}.config must be a configs/*.json path`);
    }
  }

  if (errors.some((error) => error.startsWith(prefix))) {
    return undefined;
  }

  const modelId = value.modelId as string;
  const config = typeof value.config === 'string' ? value.config : undefined;

  if (seenModelIds.has(modelId)) {
    errors.push(`${prefix}.modelId is duplicated: ${modelId}`);
    return undefined;
  }

  seenModelIds.add(modelId);

  if (config) {
    if (seenConfigs.has(config)) {
      errors.push(`${prefix}.config is duplicated: ${config}`);
      return undefined;
    }

    seenConfigs.add(config);
  }

  return {
    modelId,
    name: value.name as string,
    ...(config ? { config } : {}),
  };
}

function radiosFromSupportedRadios(supportedRadios: string[]): RadioModuleCatalogRadio[] {
  return supportedRadios.map((modelId) => ({
    modelId,
    name: modelId,
  }));
}

function validateModuleEntry(entry: unknown, index: number, errors: string[]): RadioModuleCatalogEntry | undefined {
  if (!isRecord(entry)) {
    errors.push(`modules[${index}] must be an object`);
    return undefined;
  }

  const prefix = `modules[${index}]`;

  if (!isNonEmptyString(entry.id)) {
    errors.push(`${prefix}.id is required`);
  }

  if (!isNonEmptyString(entry.package)) {
    errors.push(`${prefix}.package is required`);
  }

  if (!isNonEmptyString(entry.manufacturer)) {
    errors.push(`${prefix}.manufacturer is required`);
  }

  if (!isNonEmptyString(entry.version)) {
    errors.push(`${prefix}.version is required`);
  }

  const hasRadios = Array.isArray(entry.radios);
  const hasSupportedRadios = Array.isArray(entry.supportedRadios);
  let radios: RadioModuleCatalogRadio[] = [];
  let supportedRadios: string[] = [];

  if (hasRadios) {
    if (entry.radios.length === 0) {
      errors.push(`${prefix}.radios must be a non-empty array`);
    } else {
      const seenModelIds = new Set<string>();
      const seenConfigs = new Set<string>();

      radios = entry.radios
        .map((radio, radioIndex) =>
          validateCatalogRadio(radio, `${prefix}.radios[${radioIndex}]`, errors, seenModelIds, seenConfigs),
        )
        .filter((radio): radio is RadioModuleCatalogRadio => radio !== undefined);
    }

    supportedRadios = radios.map((radio) => radio.modelId);

    if (hasSupportedRadios) {
      if (entry.supportedRadios.length === 0 || !entry.supportedRadios.every((radio) => isNonEmptyString(radio))) {
        errors.push(`${prefix}.supportedRadios must contain only non-empty strings`);
      } else if (!sameStringSet(entry.supportedRadios as string[], supportedRadios)) {
        errors.push(`${prefix}.supportedRadios must match radios[].modelId`);
      }
    }
  } else if (hasSupportedRadios) {
    if (entry.supportedRadios.length === 0) {
      errors.push(`${prefix}.supportedRadios must be a non-empty array`);
    } else if (!entry.supportedRadios.every((radio) => isNonEmptyString(radio))) {
      errors.push(`${prefix}.supportedRadios must contain only non-empty strings`);
    } else {
      supportedRadios = entry.supportedRadios as string[];
      radios = radiosFromSupportedRadios(supportedRadios);
    }
  } else {
    errors.push(`${prefix}.radios must be a non-empty array`);
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
    ...(typeof entry.description === 'string' ? { description: entry.description } : {}),
    version: entry.version as string,
    radios,
    supportedRadios,
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

  if (typeof value.schemaVersion !== 'number' || !SUPPORTED_SCHEMA_VERSIONS.has(value.schemaVersion)) {
    errors.push(`Unsupported schemaVersion: expected ${[...SUPPORTED_SCHEMA_VERSIONS].join(' or ')}`);
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
      schemaVersion: value.schemaVersion as number,
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
