import type { RadioConfigMetadata, RegistryRadio } from '../types/radio-config.js';

interface RefObject {
  $ref: string;
}

function isRefObject(value: unknown): value is RefObject {
  return typeof value === 'object' && value !== null && '$ref' in value && typeof (value as RefObject).$ref === 'string';
}

function resolveRef(ref: string, documentsByRef: Record<string, unknown>): unknown {
  if (!(ref in documentsByRef)) {
    throw new Error(`Missing document for $ref: ${ref}`);
  }

  return structuredClone(documentsByRef[ref]);
}

function resolveValue(value: unknown, documentsByRef: Record<string, unknown>): unknown {
  if (isRefObject(value)) {
    return resolveRef(value.$ref, documentsByRef);
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, documentsByRef));
  }

  if (typeof value === 'object' && value !== null) {
    const result: Record<string, unknown> = {};

    for (const [key, nested] of Object.entries(value)) {
      result[key] = resolveValue(nested, documentsByRef);
    }

    return result;
  }

  return value;
}

function normalizeMetadata(raw: unknown): RadioConfigMetadata {
  const metadata = (typeof raw === 'object' && raw !== null ? raw : {}) as Partial<RadioConfigMetadata> & Record<string, unknown>;

  return {
    moduleId: typeof metadata.moduleId === 'string' ? metadata.moduleId : '',
    moduleVersion: typeof metadata.moduleVersion === 'string' ? metadata.moduleVersion : '',
    pluginPath: typeof metadata.pluginPath === 'string' ? metadata.pluginPath : '',
    ...(typeof metadata.lastUpdated === 'string' ? { lastUpdated: metadata.lastUpdated } : {}),
    ...(typeof metadata.author === 'string' ? { author: metadata.author } : {}),
    ...(typeof metadata.license === 'string' ? { license: metadata.license } : {}),
  };
}

/**
 * Parse radio config JSON (or object) and inline `$ref` documents from `documentsByRef`.
 * Keys in `documentsByRef` must match `$ref` strings exactly as they appear in the config.
 */
export function hydrateRadioConfig(
  json: string | Record<string, unknown>,
  documentsByRef: Record<string, unknown> = {},
): RegistryRadio {
  const parsed: unknown = typeof json === 'string' ? JSON.parse(json) : structuredClone(json);

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('Radio configuration must be a JSON object');
  }

  const resolved = resolveValue(parsed, documentsByRef) as Record<string, unknown>;
  resolved.metadata = normalizeMetadata(resolved.metadata);

  return resolved as unknown as RegistryRadio;
}
