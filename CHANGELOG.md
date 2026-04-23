# Changelog

All notable changes to **Design Context for LLMs** are documented here. This project follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and [Semantic Versioning](https://semver.org/).

> Historical planning notes for the pre-rebrand (잠깐살래 v1 / v2) era live in [`docs/legacy/CHANGELOG.md`](./docs/legacy/CHANGELOG.md).

## [Unreleased]

_Nothing yet._

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

[Unreleased]: https://github.com/mercuryPark/design-context-for-llms/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mercuryPark/design-context-for-llms/releases/tag/v0.1.0
