## Why

The v0.2 release closed the most visible accuracy gaps and fixed two UI bugs, but a head-to-head dump comparison (v0.1 vs v0.2 on the same Figma file, codex-assisted) plus the original audit list flagged a second tier of fidelity holes that LLM consumers will hit on real designs:

- **Stroke detail loss** — `strokeAlign`, `strokeCap/Join/Dashes`, `individualStrokes` are dropped, so OUTSIDE strokes shrink the rendered box, dashed lines become solid, and "card with bottom-only border" patterns are misread.
- **Gradient direction loss** — `gradientTransform` (rotation/scale matrix) is not preserved; the LLM gets stops without an angle.
- **Image fidelity loss** — `scaleMode` is preserved, but `rotation`, `scalingFactor`, and `cropRect` are not. "Off-center cropped hero image" reduces to a centered fit.
- **Mixed-style text runs** — when a TextNode has `figma.mixed` for `fontSize` / `fontName` / `fills`, the entire `style.*` is dropped. A bold word inside a paragraph erases the paragraph's typography.
- **Shadow render bounds** — `box` is stored as the layout box, ignoring shadow `offset/radius/spread` that pushes the rendered area beyond it. Cards with large drop-shadows lose ~20–30 px of envelope.
- **Rotation transforms** — only `rotation` (degrees) is preserved; the underlying `relativeTransform` (2×3 matrix) needed to reproduce off-center anchored rotations is lost.
- **Instance overrides `nodeType` empty** — v0.2 deliberately dropped the per-override `getNodeByIdAsync` lookup for performance and reserved `nodeType` for a post-walk enrichment pass. v0.3 supplies that pass at zero extra API cost.
- **Variables metadata** — `scope` and `codeSyntax` are not extracted, so the LLM can't tell which contexts a variable applies to.

On the UX side, v0.2's `cancel` handshake landed but the UI still has no Cancel button, no Retry button, no SVG-cap warning, and `figma.clientStorage` persistence is documented but not wired up (current code uses `localStorage`).

On the ops side, version is duplicated across 5 files (`package.json`, `src/meta.ts`, `site/index.html`, `site/app.js`, `site/og-image.svg`), `esbuild@0.24.0` carries an open advisory (GHSA-67mh-4wv8-2f99), and the release workflow only validates the tag format — the zip is built and uploaded by hand.

This change ships those fixes as a single quality pass. Every output-schema change is additive (no breaking type changes), so the schema bumps `2.0 → 2.1`. The plugin package bumps `0.2.0 → 0.3.0`.

## What Changes

### Output schema (additive — schemaVersion 2.0 → 2.1)
- `VectorNode` / `FrameLikeNode`: add `strokeAlign`, `strokeCap`, `strokeJoin`, `strokeDashes`, `strokeMiterLimit`, `individualStrokes`. Each emitted only when non-default.
- Gradient `Paint`: add `gradientTransform: number[][]` (2×3 matrix) on `GRADIENT_LINEAR` / `RADIAL` / `ANGULAR` / `DIAMOND`.
- Image `Paint`: add `rotation` (deg), `scalingFactor`, `cropRect: { x, y, w, h }` when present.
- `TextNode.style`: add optional `runs: Array<{ start, end, fontFamily?, fontStyle?, fontSize?, lineHeight?, letterSpacing?, fills?, textCase?, textDecoration? }>` populated only when the node has `figma.mixed` style fields. Top-level `style` keys remain populated for non-mixed runs.
- `NodeCommon`: add `renderBox?: Box` when shadow/blur effects extend the rendered envelope past `box`. `relativeTransform?: number[][]` (2×3 matrix) when the node is rotated and the layout box doesn't capture the off-center anchor.
- `InstanceNode.overrides[id].nodeType` is now populated by a post-walk enrichment pass that uses the already-built children id→type map. No additional Figma API calls.
- `VariableEntry`: add `scope?: string[]`, `codeSyntax?: { WEB?, ANDROID?, iOS? }` when present.

### Plugin UI
- Cancel button visible during `loadingPages → sending`; sends the existing `cancel` message and waits for the `phase: idle` handshake landed in v0.2.
- Retry button on the error banner that re-runs the last dump request (already exists as i18n key, just needs the UI wiring).
- SVG cap overflow and style-collection failures land in `meta.warnings` and surface as a yellow badge in the UI.
- All `aria-label` strings move to `data-i18n` keys so Korean screen readers stop hearing English labels.
- Persistence migrates from `localStorage` to `figma.clientStorage` via a sandbox round-trip. Existing `localStorage` values are read once, mirrored to `clientStorage`, and the localStorage entry is cleared.

### Ops
- Build-time injection of `package.json#version` into `src/meta.ts` (via esbuild `define`) — single source of truth.
- `site/*` consumes the same constant via a build step.
- `esbuild` 0.24.0 → 0.25.x, with a typecheck + bundle-size verification.
- Fixture-test coverage extended: `prune`, `slugify`, `chunk` transport, `extract/text` letterSpacing branches, `extract/frame` cornerRadii branches.
- `.github/workflows/release.yml` runs `npm ci → verify:all → zip allowlist → sha256 → gh release upload` automatically on tag push.

## Capabilities

### New Capabilities
<!-- None. -->

### Modified Capabilities
- `dump-engine` — new extraction fields for stroke/gradient/image/text-runs/render-bounds/transform/variables; instance-override post-walk enrichment.
- `output-schema` — additive 2.1 fields and the new `runs` / `renderBox` / `relativeTransform` shapes.
- `plugin-ui` — cancel button, retry button, warnings panel for SVG/style failures, `aria-label` i18n, `clientStorage` migration.
- `distribution` — automated release zip + sha256 + GitHub Release upload.

## Impact

- **Schema version**: bump `SCHEMA_VERSION` from `"2.0"` to `"2.1"` and `$schema` URL to `https://dcl-figma.dev/schemas/2.1.json`. Additive only — every 2.0 consumer continues to parse 2.1 dumps without modification.
- **Package version**: bump `package.json` from `0.2.0` to `0.3.0`. `src/meta.ts` `VERSION` is now build-injected (no more manual sync).
- **Bundle size**: `dist/code.js` is expected to grow from 38.5 KB to roughly 45 KB; well under the 500 KB CI ceiling. The fixture test bundle stays out of the release zip per the v0.2.0 fix.
- **Dependencies**: `esbuild` 0.24.0 → 0.25.x is the only dev-dep change. Zero new runtime deps.
- **Downstream docs**: `docs/SCHEMA.md`, `README*.md`, `CHANGELOG.md`, and `site/*` updated.
- **CI**: `release.yml` becomes a real release pipeline; the existing `verify:all` gate stays the per-PR ceiling.
- **Backward compatibility**: every output-schema change is additive. Consumers that only handle 2.0 fields continue to work; the `$schema` URL bump signals 2.1 to those that do version checks.
