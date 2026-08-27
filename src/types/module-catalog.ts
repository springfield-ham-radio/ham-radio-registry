/**
 * Official radio module catalog index (served via GitHub Pages).
 */
export interface RadioModuleCatalog {
  schemaVersion: number;
  modules: RadioModuleCatalogEntry[];
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
