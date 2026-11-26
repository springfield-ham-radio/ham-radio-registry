# Band-indexed CAT fields on RadioCatConfig

**Status:** accepted  
**Date:** 2026-11-26  
**Related:** [ham-radio-ui ADR 0022 — Kenwood band-indexed CAT](https://github.com/springfield-ham-radio/ham-radio-ui/blob/main/docs/adr/0022-kenwood-band-indexed-cat.md)

## Context

The Kenwood TH-D74 live-control profile uses a band-first Kenwood CAT dialect: `FQ`/`MD`/`PC` take the band index first, optional per-band selectable mode names, and read-only `VM` activity labels. Those keys ship in `radio-module-kenwood` `kenwood-th-d74.json` and are consumed by HamBench (`cat-capability.ts`, `kenwood-cat-profile.ts`, `kenwood-cat-session.ts`). `@springfield/ham-radio-registry` already defined `RadioCatConfig` for earlier Kenwood fields but did not name `bandIndexed`, `bandModes`, `vfoModeCommand`, or `vfoModes`. Hydration preserved them in JSON; TypeScript callers importing the registry type could not see them.

## Decision

- Add four optional fields on `RadioCatConfig`: `bandIndexed?: boolean`, `bandModes?: string[][]`, `vfoModeCommand?: string`, `vfoModes?: string[]`.
- `modes` remains the full MD code list in CAT code order; `bandModes` lists operator-selectable mode names per band index.
- `vfoModeCommand` names the read-only activity command (for example `VM`); `vfoModes` labels each VM code in order.
- Do not add new runtime validation in this package. Semantic checks (band list length, names in `modes`, `vfoChannel` vs `bandIndexed`) stay in HamBench.

## Consequences

- Minor semver release of `@springfield/ham-radio-registry`.
- TM-D710A, TH-F6, and other configs without these keys remain valid.
- HamBench can drop its local duplicate `RadioCatConfig` after depending on this release.
- `ham-radio-docs` config reference can document the four fields separately; the utils protocol schema may continue to omit `cat`.
