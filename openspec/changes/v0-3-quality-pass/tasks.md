## 1. Cluster A — Stroke 7-fields + gradientTransform (codex-implemented)

- [x] 1.1 Extend `src/schema.ts` (FrameLikeNode, VectorNode) with `strokeAlign`, `strokeCap`, `strokeJoin`, `strokeDashes`, `strokeMiterLimit`, `individualStrokes`. Extend Paint gradient variants with optional `gradientTransform: number[][]`.
- [x] 1.2 Update `src/extract/frame.ts` and `src/extract/vector.ts` to extract the 6 stroke fields with default-value pruning.
- [x] 1.3 Update `src/extract/common.ts#normalizePaints` to preserve `gradientTransform` (skip identity matrix).
- [x] 1.4 Add fixture cases to `src/slim/toSlim.test.ts` — or create `src/extract/frame.test.ts` — that pin the new fields and the pruning behavior.
- [x] 1.5 Verify: `npm run typecheck && npm test && npm run build && openspec validate v0-3-quality-pass --strict`.

## 2. Cluster B — Image fill detail + Variables scope/codeSyntax

- [ ] 2.1 Extend `src/schema.ts` Paint IMAGE variant with `rotation?`, `scalingFactor?`, `cropRect?`. Extend `VariableEntry` with `scope?: string[]`, `codeSyntax?: { WEB?, ANDROID?, iOS? }`.
- [ ] 2.2 Update `src/extract/common.ts#normalizePaints` to preserve image rotation/scaling/crop.
- [ ] 2.3 Update `src/tokens/variables.ts` to capture `scope` and `codeSyntax` per Variable entry.
- [ ] 2.4 Add fixture coverage and verify.

## 3. Cluster C — Mixed text runs (textRange)

- [ ] 3.1 Extend `src/schema.ts` `TextNode.style` with `runs?: Array<{ start, end, fontFamily?, fontStyle?, fontSize?, lineHeight?, letterSpacing?, fills?, textCase?, textDecoration? }>`.
- [ ] 3.2 Update `src/extract/text.ts` to detect `figma.mixed` style fields, call `node.getStyledTextSegments(...)` for the union of mixed properties, collapse adjacent identical runs, and emit `style.runs`.
- [ ] 3.3 Top-level `style.*` fields stay populated for non-mixed runs (do not regress single-style text).
- [ ] 3.4 Add fixture coverage and verify.

## 4. Cluster D — Shadow renderBox + relativeTransform

- [ ] 4.1 Extend `src/schema.ts` NodeCommon with `renderBox?: Box`, `relativeTransform?: number[][]`.
- [ ] 4.2 Update `src/extract/common.ts#nodeBox` (or a new helper) to compute `renderBox` from `effects` (DROP_SHADOW spread/blur/offset, BACKGROUND_BLUR/LAYER_BLUR radius). Skip when expansion ≤ 0.5 px.
- [ ] 4.3 Update `commonFields` to extract `relativeTransform` when `rotation !== 0`.
- [ ] 4.4 Add fixture coverage and verify.

## 5. Cluster E — Instance overrides nodeType post-walk enrichment

- [ ] 5.1 In `src/extract/index.ts` (or a new `src/extract/postwalk.ts`), after the main walk completes, traverse each `INSTANCE` subtree, build an `id → type` map from its `children`, and stamp `overrides[id].nodeType` whenever an id matches.
- [ ] 5.2 Do NOT call `figma.getNodeByIdAsync`. The pass is in-memory only.
- [ ] 5.3 Add fixture coverage and verify.

## 6. Cluster F — UX hotfixes (cancel/retry/aria/warnings/clientStorage)

- [ ] 6.1 Add a Cancel button to `src/ui.html` and wire it in `src/ui/main.ts` to send `{type: "cancel"}` and hide on `idle/done`.
- [ ] 6.2 Add a Retry button to the error banner that re-sends the previous `dump` payload.
- [ ] 6.3 Move all `aria-label` strings to `data-i18n` keys; ensure `verify:locales` continues to pass.
- [ ] 6.4 Surface `meta.warnings` (svgFailed, svgCapped, styleError, variablesError) in the warning panel.
- [ ] 6.5 Replace `localStorage` persistence with a sandbox round-trip to `figma.clientStorage`. Implement a one-time migration: read the v0.2 localStorage payload if present, send it to sandbox, delete localStorage on ack.
- [ ] 6.6 Verify `npm test` (UI bits via fixture wherever possible) and run the build.

## 7. Cluster G — Single-source version + esbuild upgrade + fixture coverage

- [ ] 7.1 In `build.mjs`, read `package.json#version` and inject as `__PACKAGE_VERSION__` into both sandbox and UI bundles. Update `src/meta.ts` to consume it via `declare const __PACKAGE_VERSION__: string` with the existing literal as a dev fallback.
- [ ] 7.2 Add a small `scripts/sync-site-version.mjs` (or extend `build.mjs`) that emits `site/version.json` and have `site/app.js` read it for hero/CTA labels. Remove hardcoded `0.2.0` strings from `site/*`.
- [ ] 7.3 Upgrade `esbuild` 0.24.0 → 0.25.x in `package.json`. Update `package-lock.json`. Run `npm run verify:all`.
- [ ] 7.4 Extend fixture tests:
  - `src/util/prune.test.ts`: prune defaults + round2 edge cases.
  - `src/util/slugify.test.ts`: ASCII / Hangul / fallback cases.
  - `src/transport/chunk.test.ts`: split + reassemble round-trip, multi-kind interleaving.
  - `src/extract/text.test.ts`: letterSpacing % vs px vs unknown branches.
  - `src/extract/frame.test.ts`: cornerRadii (mixed / per-corner / all-zero).
- [ ] 7.5 Verify.

## 8. Cluster H — Release automation + sha256 + v0.3.0 cut

- [ ] 8.1 Rewrite `.github/workflows/release.yml`:
  - Trigger: `push.tags: [v*]`.
  - Job: `npm ci → verify:all → zip allowlist → sha256 → gh release upload`.
  - Tag-format check stays.
- [ ] 8.2 Update `docs/publish-runbook.md` to point at the automated path; keep the manual path as a fallback.
- [ ] 8.3 Bump `package.json` version 0.2.0 → 0.3.0.
- [ ] 8.4 Bump `SCHEMA_VERSION` "2.0" → "2.1" and `SCHEMA_URL` to `https://dcl-figma.dev/schemas/2.1.json`. Update the v2.0 → v2.1 migration section in `docs/SCHEMA.md` to enumerate the additive 2.1 fields (no breaking changes).
- [ ] 8.5 Move CHANGELOG `[Unreleased]` to `[0.3.0] - <release date>`. Update README schema-callout, site/* version refs (driven by 7.1/7.2 single-source).
- [ ] 8.6 Tag v0.3.0, push main + tag. Verify CI release workflow succeeds and the zip + .sha256 land on the GitHub Release.

## 9. Out-of-scope (tracked here for visibility)

- [ ] 9.1 Per-page split output (Roadmap).
- [ ] 9.2 Option presets save/share (Roadmap).
- [ ] 9.3 Figma Code Connect integration (Roadmap).
- [ ] 9.4 F-1 constraints noise filtering — explicitly excluded; conflicts with accuracy-first product intent.
- [ ] 9.5 Hyperlink data inside text runs (defer; v0.4 candidate).
