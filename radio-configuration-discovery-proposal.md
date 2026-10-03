# Radio Configuration Discovery

## Current design

Radio modules are not distributed or discovered as npm packages. Each manufacturer module is a **JSON-only zip** attached to a GitHub Release. The desktop app finds those releases through the official catalog repository, [springfield-ham-radio/radio-module-catalog](https://github.com/springfield-ham-radio/radio-module-catalog), and installs only entries listed there.

`@springfield/ham-radio-registry` validates that catalog and hydrates the JSON configs. ham-radio-ui fetches the catalog, downloads the zip, and stores the radios. The Node entry `@springfield/ham-radio-registry/node` can still scan a local `node_modules` tree for workspace packages during development. That scanner is not how HamBench installs radios.

### Catalog

The index is [`catalog.json`](https://github.com/springfield-ham-radio/radio-module-catalog/blob/main/catalog.json). GitHub Pages serves it on every push to `main`:

`https://springfield-ham-radio.github.io/radio-module-catalog/catalog.json`

The document shape is [`catalog.schema.json`](https://github.com/springfield-ham-radio/radio-module-catalog/blob/main/catalog.schema.json). The published catalog uses `schemaVersion` `1`. `validateModuleCatalog` / `parseModuleCatalog` in this repo accept schema versions `1` and `2` and reject anything else.

```json
{
  "schemaVersion": 1,
  "modules": [
    {
      "id": "baofeng",
      "package": "@springfield/radio-module-baofeng",
      "manufacturer": "Baofeng",
      "description": "Baofeng UV-5R series (UV-5R and UV-5RE Plus share one config)",
      "version": "3.6.1",
      "radios": [
        {
          "modelId": "baofeng-uv5r",
          "name": "Baofeng UV-5R",
          "config": "configs/baofeng-uv5r.json"
        }
      ],
      "supportedRadios": ["baofeng-uv5r"],
      "minApiVersion": "17.3.0",
      "downloadUrl": "https://github.com/springfield-ham-radio/radio-module-baofeng/releases/download/v3.6.1/radio-module-baofeng-3.6.1.zip",
      "integrity": "sha256:2020c229dc81230f8305464e2eb327e508e21b41ea4651f1a60b9f18672da9ce"
    }
  ]
}
```

| Field | Meaning |
| --- | --- |
| `id` | Stable module id. Install directory name (`baofeng`). |
| `package` | Package name for developers (`@springfield/radio-module-baofeng`). It is not an npm install coordinate. Module releases set `npmPublish: false`. |
| `version` | Zip version from the GitHub Release, not each radio config's own driver version. |
| `radios` | One entry per `configs/*.json` inside the zip: `modelId` (`id.model`), `name` (`id.name`), and `config` (`configs/<file>.json`). Models that share a config are listed once. |
| `supportedRadios` | The same ids as `radios[].modelId`, kept so schema version 1 clients can list models. The parser also accepts older entries that only have `supportedRadios` and synthesizes `radios` from those ids. |
| `minApiVersion` | Minimum `@springfield/ham-radio-api` version. Compared as dotted integers (`compareSemver`). Compatible when the app version is greater than or equal to this value. |
| `downloadUrl` | HTTPS URL of the release zip. |
| `integrity` | SHA-256 of the zip bytes, `sha256:` plus 64 hex characters. Stored lowercased. |

`parseModuleCatalog` throws when the JSON is invalid or validation fails. Duplicate module ids, duplicate `modelId`s, and duplicate `config` paths inside one module are rejected.

### Publishing a module

Module repositories (for example `radio-module-baofeng`) stay JSON. `yarn pack:release` (also run from semantic-release `prepareCmd`) builds the zip and a catalog fragment:

1. Zip `configs/`, `src/shared/schemas/`, and `src/shared/memory-maps/` into `dist-release/radio-module-<name>-<version>.zip`. The archive is JSON only.
2. Hash the zip and write `dist-release/catalog-module.json` (`id`, `package`, `manufacturer`, `version`, `radios` read from each `configs/*.json`, `supportedRadios`, `minApiVersion`, `downloadUrl`, `integrity`).
3. semantic-release attaches that zip to the GitHub Release. npm publish is off.

Update the catalog by copying that fragment into `catalog.json` (or by updating `version`, `downloadUrl`, `integrity`, and `radios`). Pushing `main` on `radio-module-catalog` deploys GitHub Pages. Do not invent radio ids.

### How ham-radio-ui installs from the catalog

`app/utils/radio-module-install.ts` fetches the Pages URL (overrideable) and calls `parseModuleCatalog`.

Official install (`installOfficialModule`):

1. Reject the entry when `minApiVersion` is newer than the app's API version (`APP_HAM_RADIO_API_VERSION`, currently `17.3.0`). The preferences list shows those modules as blocked until HamBench is updated.
2. Invoke the Tauri command `download_and_install_radio_module` with `downloadUrl`, `integrity`, `id`, and `version`.
3. The command allows HTTPS downloads only from `github.com`, `objects.githubusercontent.com`, `release-assets.githubusercontent.com`, and `springfield-ham-radio.github.io`. It checks the SHA-256 against `integrity` before writing anything.
4. Extraction allows only `.json` entries, refuses absolute paths and `..`, and requires a non-empty `configs/` directory of JSON files. Files land under app data: `radio-modules/<moduleId>/<version>/`.
5. Each selected config is read back, relative `$ref` siblings are loaded, and `hydrateRadioConfig` inlines them. `validateConfiguration` checks model id, serial config, memory config, read/write protocols, and settings schema.
6. The hydrated radio is upserted into the SQLite `radio_models` table with source `installed`, `sourcePath` set to the install directory, and a content hash from `hashRadioConfig`. An existing `user` row for the same model id is left in place.

A catalog install can be limited to one radio via `radios[].config` or `modelId`. Listing and update checks live in `app/utils/radio-module-listing.ts`: manufacturers come from the catalog, installed rows match on module id (install path or `metadata.moduleId`) or on model id, and an update is offered when the catalog `version` is greater than the version directory on disk. That comparison uses the zip version, not the driver version stored on the radio config. Rows with source `user` are not updated from the catalog.

Uninstall deletes that version directory (and the module directory when it becomes empty) and removes catalog rows that share the install `sourcePath`.

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

What remains from that work is local and in-repo only: `@springfield/ham-radio-registry/node` still exposes `NpmBasedConfigRegistry` so Node tools can load radio JSON from workspace packages already present on disk. HamBench does not install catalog modules through it. Module release configs disable npm publish and attach the JSON zip to GitHub Releases instead.
