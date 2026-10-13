# Radio Configuration Discovery

## Current design

Radio modules are not distributed or discovered as npm packages. Each official radio is a **JSON-only zip** attached to a GitHub Release. The desktop app finds those releases through the official catalog repository, [springfield-ham-radio/radio-module-catalog](https://github.com/springfield-ham-radio/radio-module-catalog), and installs only entries listed there.

`@springfield/ham-radio-registry` validates that catalog and hydrates the JSON configs. ham-radio-ui fetches the catalog, downloads the zip, and stores the radio. The Node entry `@springfield/ham-radio-registry/node` can still scan a local `node_modules` tree for workspace packages during development. That scanner is not how HamBench installs radios.

Per-radio packaging is defined in [ADR 0009](https://github.com/springfield-ham-radio/ham-radio-docs/blob/main/docs/developer/adr/0009-per-radio-modules.md). Registry **2.x** accepts catalog **schema version 3** only.

### Catalog

The index is [`catalog.json`](https://github.com/springfield-ham-radio/radio-module-catalog/blob/main/catalog.json). GitHub Pages serves it on every push to `main`:

`https://springfield-ham-radio.github.io/radio-module-catalog/catalog.json`

The document shape is [`catalog.schema.json`](https://github.com/springfield-ham-radio/radio-module-catalog/blob/main/catalog.schema.json). Published catalogs use `schemaVersion` `3`. `validateModuleCatalog` / `parseModuleCatalog` in this repo accept schema version `3` and reject `1` and `2` with an explicit error.

```json
{
  "schemaVersion": 3,
  "modules": [
    {
      "id": "baofeng-uv5r",
      "package": "@springfield/radio-module-baofeng-uv5r",
      "manufacturer": "Baofeng",
      "name": "Baofeng UV-5R",
      "description": "Baofeng UV-5R and UV-5RE Plus share one config",
      "version": "3.7.0",
      "config": "configs/baofeng-uv5r.json",
      "minApiVersion": "18.0.1",
      "downloadUrl": "https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.7.2/radio-module-baofeng-uv5r-3.7.0.zip",
      "integrity": "sha256:2020c229dc81230f8305464e2eb327e508e21b41ea4651f1a60b9f18672da9ce"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id` | Config `id.model`. Install directory name (`baofeng-uv5r`). |
| `package` | Per-radio package id for developers (`@springfield/radio-module-baofeng-uv5r`). Not an npm install coordinate. Manufacturer git repos keep `@springfield/radio-module-baofeng` in their own `package.json`. |
| `manufacturer` | Manufacturer label (e.g. `Baofeng`, `Kenwood`). |
| `name` | Config `id.name` (display name). |
| `description` | Optional human-readable blurb. |
| `version` | Driver config `version` from the JSON inside the zip ([ADR 0006](https://github.com/springfield-ham-radio/ham-radio-docs/blob/main/docs/developer/adr/0006-per-driver-config-semver.md)), not the manufacturer git tag. |
| `config` | Path to the config inside the zip (`configs/<file>.json`). Each release zip contains exactly one `configs/*.json`. |
| `minApiVersion` | Minimum `@springfield/ham-radio-api` version required for this radio. Compared with `compareSemver` / `isApiVersionCompatible`. |
| `downloadUrl` | HTTPS URL of the per-radio release zip. |
| `integrity` | SHA-256 of the zip bytes, `sha256:` plus 64 hex characters. Stored lowercased. |

`parseModuleCatalog` throws when the JSON is invalid or validation fails. Duplicate `id` values (model ids) are rejected. Legacy `radios[]` and `supportedRadios` fields are rejected.

### Publishing a module

Manufacturer repositories (for example `radio-module-baofeng`, `radio-module-kenwood`) stay JSON. `yarn pack:release` builds **one zip per** `configs/*.json` and writes catalog fragments for schema version 3:

1. For each config, zip that `configs/<file>.json` and every relative `$ref` it reaches into `dist-release/radio-module-<modelId>-<config.version>.zip`. The archive is JSON only.
2. Hash each zip and write `dist-release/catalog-entries.json` (array of schema version 3 entries: `id`, `package`, `manufacturer`, `name`, `version`, `config`, `minApiVersion`, `downloadUrl`, `integrity`).
3. semantic-release attaches every changed zip to the GitHub Release. npm publish is off.

Update the catalog by merging those entries into `catalog.json`. Pushing `main` on `radio-module-catalog` deploys GitHub Pages. Do not invent radio ids.

### How ham-radio-ui installs from the catalog

`app/utils/radio-module-install.ts` fetches the Pages URL (overrideable) and calls `parseModuleCatalog`.

Official install (`installOfficialModule`) with registry 2.x:

1. Reject the entry when `minApiVersion` is newer than the app's API version (`APP_HAM_RADIO_API_VERSION`). The preferences list shows those modules as blocked until HamBench is updated.
2. Invoke the Tauri command `download_and_install_radio_module` with `downloadUrl`, `integrity`, `id`, and `version`.
3. The command allows HTTPS downloads only from trusted GitHub hosts. It checks the SHA-256 against `integrity` before writing anything.
4. Extraction allows only `.json` entries, refuses absolute paths and `..`, and requires exactly one `configs/*.json`. Files land under app data: `radio-modules/<modelId>/<configVersion>/`.
5. The config is read back, relative `$ref` siblings are loaded, and `hydrateRadioConfig` inlines them. `validateConfiguration` checks model id, serial config, memory config, read/write protocols, and settings schema.
6. The hydrated radio is upserted into the SQLite `radio_models` table with source `installed`, `sourcePath` set to the install directory, and a content hash from `hashRadioConfig`.

Listing and update checks match catalog entries by `id` (model id). An update is offered when the catalog `version` is greater than the installed directory version. Rows with source `user` are not updated from the catalog.

Uninstall removes that radio's catalog row and that radio's version directory only.

### Local modules

The app can also install a zip or a single config JSON chosen on disk. Those rows use source `user`. A local zip is not checked against the catalog integrity value. Relative `$ref` JSON next to a chosen config is loaded the same way. User JSON rows are re-read from disk on startup so local edits show up without a reinstall.

Catalog sources on a stored radio are `bundled`, `installed`, or `user`.

### What this registry package does

Browser-safe exports (no `node:fs`):

- `parseModuleCatalog`, `validateModuleCatalog`, `compareSemver`, `isApiVersionCompatible`, `normalizeIntegrity`, `integrityFromSha256Hex`
- `hydrateRadioConfig` for `$ref` inlining
- `validateConfiguration`, `extractCatalogMetadata`, `hashRadioConfig`

`RadioModuleCatalog` / `RadioModuleCatalogEntry` in `src/types/module-catalog.ts` are the catalog types. `RadioCatalogEntry` is the lighter per-radio record (model, capabilities, source, content hash) stored by the app.

## Superseded: npm distribution proposal

The rest of the original proposal — npm packages such as `@springfield/radio-module-baofeng`, `package.json` `springfield.pluginType`, keyword search, `NpmBasedConfigRegistry.discoverConfigurations()` over `node_modules` as the product install path, and `yarn add` from an npm registry — is **not** the shipping design. Do not implement discovery or third-party distribution that way.

What remains from that work is local and in-repo only: `@springfield/ham-radio-registry/node` still exposes `NpmBasedConfigRegistry` so Node tools can load radio JSON from workspace packages already present on disk. HamBench does not install catalog modules through it. Module release configs disable npm publish and attach JSON zips to GitHub Releases instead.
