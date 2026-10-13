# ham-radio-registry

Loads and validates HamBench radio JSON configs. The desktop app installs official radios from GitHub Releases via the official catalog; in Node, the registry can also resolve workspace packages.

Docs: [Registry](https://springfield-ham-radio.github.io/ham-radio-docs/developer/registry/) · [Publish a module](https://springfield-ham-radio.github.io/ham-radio-docs/developer/publishing-modules.html) · [ADR 0009 — per-radio modules](https://github.com/springfield-ham-radio/ham-radio-docs/blob/main/docs/developer/adr/0009-per-radio-modules.md)

## Catalog (schema version 3)

`parseModuleCatalog` and `validateModuleCatalog` accept **schema version 3** only. Each `modules[]` entry describes one installable radio. `package` must be `@springfield/radio-module-<id>`, `config` must be `configs/<id>.json`, and the download URL must name `radio-module-<id>-<version>.zip`. `version` and `minApiVersion` must be `major.minor.patch`. Schema versions 1 and 2 are rejected with that schema error alone.

See [`radio-configuration-discovery-proposal.md`](./radio-configuration-discovery-proposal.md) for the full field list and install flow.

```bash
corepack enable
yarn install
yarn build
yarn test
```
