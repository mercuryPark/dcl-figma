# Changelog

All notable changes to **Design Context for LLMs** are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

> Historical planning notes for the pre-rebrand (잠깐살래 v1 / v2) era live in [`docs/legacy/CHANGELOG.md`](./docs/legacy/CHANGELOG.md).

## [0.3.0] - 2026-05-07

> **Schema bumps from `2.0` → `2.1`** (plugin package version is `0.3.0`). This release is additive only: existing 2.0 consumers can ignore the new optional fields and continue reading dumps. See [`docs/SCHEMA.md`](./docs/SCHEMA.md#version-diff-log) for the full 2.1 field list.

### Added
- **Stroke fidelity**: FRAME-like and VECTOR nodes now preserve `strokeAlign`, `strokeCap`, `strokeJoin`, `strokeDashes`, `strokeMiterLimit`, and asymmetric frame `individualStrokes`.
- **Paint fidelity**: gradients preserve non-identity `gradientTransform`; image paints preserve `rotation`, `scalingFactor`, and `cropRect` when available.
- **Text fidelity**: mixed-style text now emits `style.runs[]` for per-range font, size, line-height, letter-spacing, fill, case, and decoration data.
- **Geometry fidelity**: nodes can emit `renderBox` for shadow/blur-expanded bounds and `relativeTransform` for rotated transforms.
- **Instance and Variables metadata**: instance overrides get `nodeType` via post-walk enrichment, and variables include optional `scope` plus `codeSyntax`.
- **Release automation**: tag pushes now run `npm ci`, `verify:all`, allowlisted release zip creation, SHA256 generation, changelog note extraction, and GitHub Release creation.
- **Fixture coverage**: added tests for stroke pruning, image/gradient detail, mixed text runs, render bounds/transforms, instance post-walk enrichment, variables metadata, UI behavior, prune/slugify/chunk utilities, and frame/text edge cases.

### Changed
- `schemaVersion` is now `"2.1"` and `$schema` points to `https://dcl-figma.dev/schemas/2.1.json`.
- Package version is now `0.3.0`; build output and landing-site version text are synced from `package.json`.
- UI persistence now uses `figma.clientStorage`, with a one-time migration from the previous localStorage payload.
- `esbuild` upgraded to `0.25.9`.
- Publish runbook now prefers the automated tag-driven release path and keeps manual zip/release steps as a fallback.

### Fixed
- Added Cancel and Retry UI paths around dump execution so users can stop or rerun long/erroring dumps without reopening the plugin.
- Localized ARIA labels and surfaced non-fatal `meta.warnings` for SVG caps/failures, style API errors, and Variables API failures.

## [0.2.0] - 2026-05-07

> **Schema bumps from `1.0` → `2.0`** (plugin package version is `0.2.0`). Two breaking type changes are scoped to `TextNode.style.letterSpacing` / `TypographyToken.letterSpacing` and `InstanceNode.overrides`. See migration notes in [`docs/SCHEMA.md`](./docs/SCHEMA.md#version-diff-log).

### Added
- **Layout fidelity**: `counterAxisSpacing`, `layoutWrap` extracted on FrameLikeNode; per-node `constraints` and `layoutPositioning` (only when non-default).
- **Per-corner radii**: `cornerRadii: { tl, tr, br, bl }` on FrameLikeNode and VectorNode when corners differ (or `cornerRadius` is `figma.mixed`).
- **Slim section tree layout cues**: each frame line now carries inline hints — `[hstack/vstack, wrap, justify=…, align=…, gap=…, gapY=…, p=…]` — so layout intent survives Slim mode.
- **Test harness**: zero-dependency `npm test` powered by `node:test` + `esbuild`. Initial coverage on the Slim transform's layout-hint generation, padding shorthand, and tree/text-summary invariants (10 cases).

### Changed
- **BREAKING — `schemaVersion` `"1.0"` → `"2.0"`** and `$schema` URL moves to `https://dcl-figma.dev/schemas/2.0.json`.
- **BREAKING — `TextNode.style.letterSpacing` and `TypographyToken.letterSpacing`** changed from `number` to `string | number`. Unit-aware values are now emitted as `"2%"` or `"0.5px"`; raw `number` is reserved for unit-unknown fallback. Consumers that did arithmetic on this field must now parse the unit suffix.
- **BREAKING — `InstanceNode.overrides`** changed from `Record<string, string[]>` to `Record<string, { fields: string[]; nodeType?: string }>`. The current values for overridden fields remain recoverable via the matching child id within `children`; this change only restructures the metadata. The per-override `figma.getNodeByIdAsync` lookup was also removed to eliminate latency on instance-rich pages.

### Fixed
- **Progress bar stuck at 0%**: phase-based percentage mapping with an asymptotic curve during the traversing phase — the bar always advances, never overshoots. Phase label additionally shows the running processed-node count during traversal.
- **Double-click on Dump button**: primary button is now disabled during a dump and re-enabled on completion, cancellation, or error. Cancelled dumps explicitly emit `phase: idle` so the UI never gets stuck in a locked state.

## [0.1.0] - 2026-04-23

### Added
- Initial public scaffolding:
  - Root `README.md` / `README.ko.md` (English + Korean).
  - `LICENSE` (MIT, © mercuryPark and contributors).
  - `CONTRIBUTING.md`, `SECURITY.md`.
  - `.github/ISSUE_TEMPLATE/{bug,feature,question}.yml`, `.github/pull_request_template.md`.
- Build infrastructure: `package.json`, `tsconfig.json`, `manifest.json`, `build.mjs` (esbuild-only, zero runtime deps).
- Sandbox pipeline:
  - `src/extract/*` — async DFS with 50-node yield, per-type extractors (Frame/Text/Instance/Vector), z-order preserved.
  - `src/tokens/*` — Paint/Text/Effect styles + Variables (per-mode entries).
  - `src/slim/*` — Full → Slim transform with 3-stage degradation ladder (`textSummary:20->10` → `sectionTree:3->2` → `tokens:dropped`).
  - `src/svg/*` — opt-in SVG export, `icon/*` glob + ≤64×64 filter, `pLimit(10)` concurrency, cap 100.
  - `src/transport/chunk.ts` — 500KB chunked postMessage + receive assembler.
- Plugin UI (`src/ui/main.ts` + `src/ui.html`):
  - 1-click "Dump" primary button, Advanced options disclosure.
  - Scope radio: Selection / Current page / All pages.
  - 3-tier output: Download Slim / Download Full / Copy Slim to Clipboard.
  - `en` + `ko` i18n runtime with locale toggle, localStorage persistence.
  - Progress bar with ARIA and phase labels.
  - Non-fatal warning list + fatal error banner.
- Zero network / zero telemetry:
  - `manifest.json` declares `networkAccess.allowedDomains: ["none"]`.
  - `scripts/verify-manifest.mjs` CI gate.
  - `SECURITY.md` threat model + reporting policy.
- Output contract (`schemaVersion: "1.0"`):
  - Self-documenting top-level envelope (`$schema`, `schemaVersion`, `_howToUse`, `meta`).
  - Deterministic file names: `figma.{fileSlug}.{pageSlug}.{slim|full}.json`.
  - `meta.degraded` audit trail for the Slim degradation ladder.
  - Documented in `docs/SCHEMA.md` (narrative) + `src/schema.ts` (types).
- GitHub Actions CI: typecheck → build → manifest validate → locale parity → 500KB bundle ceiling.
- Distribution via GitHub Releases with a pre-built `dist/` zip — no Figma Community listing in this release.
- Validated end-to-end on the 잠깐살래 file: 8,335 nodes, 84 components, 15 variables. Slim 64 KB, Full 2.1 MB, no degradation needed.

[Unreleased]: https://github.com/mercuryPark/dcl-figma/compare/v0.3.0...HEAD
[0.3.0]: https://github.com/mercuryPark/dcl-figma/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/mercuryPark/dcl-figma/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mercuryPark/dcl-figma/releases/tag/v0.1.0
