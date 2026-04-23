# v0.1.0 — Initial Release

**Design Context for LLMs** is a free, zero-telemetry Figma plugin that exports your design file as an LLM-ready JSON snapshot. Drop the output into Claude Code, Cursor, GitHub Copilot, Aider, or any LLM session.

> This is a pre-release. The plugin has been validated end-to-end against a real 8,335-node Figma file, but `v1.x` bumps may introduce schema additions. See [`ROADMAP.md`](./ROADMAP.md) for planned improvements.

## Install

1. Download `design-context-for-llms-v0.1.0.zip` from the **Assets** below.
2. Unzip into any folder (for example `~/figma-plugins/design-context-for-llms/`).
3. In Figma Desktop: **Plugins → Development → Import plugin from manifest…** → select the unzipped `manifest.json`.
4. Run with **Plugins → Development → Design Context for LLMs**.

## Highlights

- **Two outputs:** `Slim` (< 500 KB, LLM-friendly) and `Full` (≤ 10 MB, lossless).
- **Self-documenting JSON** — every dump starts with `$schema`, `schemaVersion`, and a one-line `_howToUse` string.
- **Smart auto-shrink** — if Slim exceeds 500 KB, the plugin reduces `textSummary`, then `sectionTree` depth, then drops `tokens`, logging each step in `meta.degraded`.
- **Zero network / zero telemetry** — `manifest.json` declares `networkAccess.allowedDomains: ["none"]` and CI enforces it on every PR.
- **en / ko** i18n with runtime locale toggle.
- **Deterministic filenames** — `figma.{fileSlug}.{pageSlug}.{slim|full}.json`, Hangul-aware.
- **1-click Dump UI** with progress, warnings, and 3-tier output (download Slim / download Full / copy Slim to clipboard).

## Verified on a real file

Dumped the 잠깐살래 app (8,335 nodes / 84 components / 15 variables) in a single run:
- Slim: 64 KB (no degradation needed).
- Full: 2.1 MB.
- `variablesError: false`, no crashes.

## What's not in this release

- Figma Community listing (this is a GitHub-only distribution — see [ROADMAP.md](./ROADMAP.md) for future options).
- Pixel-level design reproduction (see the "honesty about scope" note in [ROADMAP.md](./ROADMAP.md#v11-후보--llm-재현-품질-개선)).
- P0–P4 quality improvements (tracked in ROADMAP, deferred to v1.x).

## Requirements

- Figma Desktop (any currently maintained build — the plugin uses the `dynamic-page` API that became mandatory for new plugins in April 2024).

## License

MIT © mercuryPark and contributors.
