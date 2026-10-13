/**
 * Official radio module catalog index (served via GitHub Pages).
 * @see ADR 0009 — schema version 3 lists one installable radio per entry.
 */
export interface RadioModuleCatalog {
  schemaVersion: number;
  modules: RadioModuleCatalogEntry[];
}

/**
 * One installable official radio listed in the catalog (schema version 3).
 * `id` is the config `id.model` (e.g. `baofeng-uv5r`). `version` is the driver config version.
 */
export interface RadioModuleCatalogEntry {
  /** Config `id.model`, e.g. `baofeng-uv5r`. Install directory name. */
  id: string;
  /** Per-radio package id, e.g. `@springfield/radio-module-baofeng-uv5r` (not an npm coordinate). */
  package: string;
  manufacturer: string;
  /** Config `id.name`, e.g. `Baofeng UV-5R`. */
  name: string;
  description?: string;
  /** Config `version` (driver semver), not the manufacturer git tag. */
  version: string;
  /** Path inside the zip, e.g. `configs/baofeng-uv5r.json`. */
  config: string;
  minApiVersion: string;
  downloadUrl: string;
  /** SHA-256 of the zip as `sha256:<hex>`. */
  integrity: string;
}

export interface CatalogValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}
