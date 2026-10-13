# ham-radio-registry

Loads and validates HamBench radio JSON configs. The desktop app installs official radios from GitHub Releases via the official catalog; in Node, the registry can also resolve workspace packages.

Docs: [Registry](https://springfield-ham-radio.github.io/ham-radio-docs/developer/registry/) · [Publish a module](https://springfield-ham-radio.github.io/ham-radio-docs/developer/publishing-modules.html) · [ADR 0009 — per-radio modules](https://github.com/springfield-ham-radio/ham-radio-docs/blob/main/docs/developer/adr/0009-per-radio-modules.md)

## Catalog (schema version 3)

`parseModuleCatalog` and `validateModuleCatalog` accept **schema version 3** only. Each `modules[]` entry describes one installable radio (`id` is `id.model`, `version` is the driver config version, `config` is the path inside the zip). Registry **2.x** rejects schema versions 1 and 2 and legacy `radios` / `supportedRadios` fields.

See [`radio-configuration-discovery-proposal.md`](./radio-configuration-discovery-proposal.md) for the full field list and install flow.

```bash
corepack enable
yarn install
yarn build
yarn test
```
