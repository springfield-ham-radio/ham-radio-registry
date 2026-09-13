/**
 * Official radio module catalog index (served via GitHub Pages).
 */
export interface RadioModuleCatalog {
  schemaVersion: number;
  modules: RadioModuleCatalogEntry[];
}

/**
 * One radio config shipped inside a manufacturer module zip.
 */
export interface RadioModuleCatalogRadio {
  /** Config `id.model`, e.g. `baofeng-uv5r`. */
  modelId: string;
  /** Config `id.name`, e.g. `Baofeng UV-5R`. */
  name: string;
  /** Path inside the zip, e.g. `configs/baofeng-uv5r.json`. */
  config?: string;
}

/**
 * One installable official radio module listed in the catalog.
 */
export interface RadioModuleCatalogEntry {
  id: string;
  package: string;
  manufacturer: string;
  description?: string;
  version: string;
  /** Radios actually present as `configs/*.json` in the zip. */
  radios: RadioModuleCatalogRadio[];
  /**
   * `radios[].modelId`. Kept so schemaVersion 1 clients can still list models.
   */
  supportedRadios: string[];
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
