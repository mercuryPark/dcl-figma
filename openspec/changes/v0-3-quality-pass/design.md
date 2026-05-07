## Context

v0.2 closed the visible UI bugs and the most severe schema gaps. The dump-comparison audit (v0.1 vs v0.2 on the same Figma file, codex-assisted) and the original audit list converged on a second tier: stroke detail, gradient direction, image crop, mixed-style text runs, shadow render bounds, rotation matrices, instance-override `nodeType`, and Variables `scope`. UX still misses cancel/retry buttons and warning surfacing. Ops still has version duplication, an esbuild advisory, and a manual release pipeline.

This change packs those fixes into one quality pass. Implementation is delegated to `codex exec --sandbox workspace-write` per work cluster; planning, safety filtering, verification, and merging stay with the orchestrating engineer.

## Goals / Non-Goals

**Goals:**
- Land every accuracy field the v0.2 audit identified as P1/P2 without breaking the 2.0 schema (additive only).
- Wire up the existing UX scaffolding (`cancel` handshake, `retry` i18n key, `clientStorage` doc) into actual UI affordances.
- Eliminate version duplication across the 5 places it currently lives.
- Automate the release zip pipeline so the v0.2.0 zip-leak incident cannot recur.

**Non-Goals:**
- No breaking schema changes (all 2.1 fields are additive).
- No new networking, no new runtime deps.
- F-1 (constraints noise filtering) is intentionally out of scope — accuracy-first product intent.
- Per-page split output, option presets, and Figma Code Connect are deferred (Roadmap items).

## Decisions

### 1. Mixed text runs are emitted as `style.runs` array, top-level `style` stays populated when non-mixed
**Why**: keeps the 2.0 contract (`style.fontSize` etc.) intact for the common case, only adds `runs` when `figma.mixed` actually triggers. Consumers that don't need run-level data ignore the field.
**Alternative considered**: replace top-level style with `runs` whenever any field is mixed — rejected because it forces every consumer to handle an array even for the non-mixed case.

### 2. Shadow render envelope lands as `renderBox`, not a mutation of `box`
**Why**: `box` is the layout box (matches Figma's coordinate semantics and CSS `width/height`). `renderBox` carries shadow/blur expansion separately so consumers that need the raw layout box keep getting it. Emitted only when shadow/blur changes the envelope.
**Alternative**: extend `box` itself — rejected, breaks layout-aware consumers.

### 3. `relativeTransform` only when rotation is non-zero AND off-center anchor matters
**Why**: many Figma rotations use the natural anchor where `box` + `rotation` is enough. The 2×3 matrix is only emitted when reproducing the position requires it. Avoids 6-number-array bloat on every rotated node.

### 4. Instance overrides `nodeType` is populated by a post-walk pass, not during extraction
**Why**: v0.2 deliberately removed the per-override `getNodeByIdAsync` because it caused N async calls per instance. The walker already produces a children subtree where every node carries `id` and `type`; a single in-memory pass over `instance.children` builds the id→type map and stamps `nodeType` for free. Zero additional API calls.

### 5. `clientStorage` migration is one-way and silent
**Why**: existing v0.2 users have `localStorage` keys named `dcfl:options:<fileName>`. On first v0.3 launch, the UI sends a `migrateOptions` message to the sandbox with the parsed payload; sandbox writes to `figma.clientStorage` keyed by `fileKey` and acks. UI then deletes the localStorage key. After migration, sandbox owns persistence and the UI just sends/receives intent messages.

### 6. Single-source version uses `esbuild`'s `define` injection
**Why**: `package.json#version` is read at build time and injected as `__PACKAGE_VERSION__` into both the sandbox and UI bundles, plus written to `site/version.json` consumed by `site/app.js`. `src/meta.ts` `VERSION` becomes a fallback constant for dev runs without esbuild.

### 7. Release pipeline runs in CI
**Why**: the v0.2.0 zip leaked `dist/test/` because the build sequence ran tests after build, and the developer zipped `dist/` whole. CI runs `npm ci → npm run verify:all → npm run build → zip --allowlist → sha256 → gh release upload` in that exact order, so test artifacts cannot land in the release zip.

## Risks / Trade-offs

- **[Risk]** `style.runs` adds bytes for mixed-style text. → **Mitigation**: only emitted when `figma.mixed` triggers; per-run only carries fields that actually differ from the parent.
- **[Risk]** `renderBox` increases dump size on shadow-heavy designs. → **Mitigation**: only emitted when shadow/blur expansion is ≥ 0.5 px; rounded to 2 decimals like every other coordinate.
- **[Risk]** `clientStorage` migration could lose options if the message handshake fails. → **Mitigation**: migration only deletes localStorage after the sandbox `migrateOptionsAck` message returns. On failure, the UI falls back to localStorage as before; the next launch retries.
- **[Risk]** esbuild 0.25.x might break the existing build pattern. → **Mitigation**: pin upgrade and run `npm run verify:all` before commit. Roll back if anything regresses.
- **[Trade-off]** post-walk enrichment requires a second pass over instance subtrees. → **Acceptable**: it walks only `INSTANCE` subtrees that have `overrides`, not the whole tree, and reads in-memory data only.

## Migration Plan

1. Land each work cluster as its own commit (8 clusters total).
2. Run the full verify gate (typecheck, npm test, build, manifest, locales, size, openspec validate --strict) after every cluster.
3. Bump `package.json` to `0.3.0` and `SCHEMA_VERSION` to `"2.1"` in the final release cluster.
4. Move `## [Unreleased]` to `## [0.3.0] - <release date>` in CHANGELOG.
5. Tag `v0.3.0`, push `main` and the tag — CI runs the new release.yml that uploads the zip + checksum.
6. Rollback strategy: if v0.3.0 introduces a regression, re-publish v0.2.0's zip from the existing release page.

## Open Questions

1. Should `renderBox` skip emission when the expansion is below a small threshold (e.g., 0.5 px)? Defaulting to 0.5 px in implementation, may revisit after first dump comparison.
2. The mixed-text `runs` array can technically include hyperlink data. Out of scope for v0.3; tracked separately.
