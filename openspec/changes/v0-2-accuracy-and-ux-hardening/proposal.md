## Why

Two independent audits (in-house structural review + a second-opinion `codex` deep review) surfaced three classes of v0.1 issues that block real-world usage: (1) UI bugs that make the plugin look broken to first-time users (progress bar stuck at 0%, double-click corruption, cancel can lock the primary button), (2) accuracy gaps where common Figma layout/text fields are dropped from the dump (counter-axis spacing on wrap layouts, letter-spacing unit, parent-relative constraints, per-corner radii), and (3) a per-instance `getNodeByIdAsync` lookup that scales poorly on instance-rich pages. We are also lacking any automated test harness — every regression is currently caught by manual dump-and-eyeball.

This change ships those fixes together as the v0.2 baseline before promoting the plugin to wider distribution. Bundling them avoids two breaking releases for downstream consumers (the schema changes to `InstanceNode.overrides` and `letterSpacing` are intentionally grouped here).

## What Changes

### Output schema (dump-engine + output-schema)
- Add `FrameLikeNode.counterAxisSpacing`, `FrameLikeNode.layoutWrap` — preserves cross-axis gap on wrapping auto-layouts.
- Add `NodeCommon.constraints` (only when ≠ `{MIN, MIN}`) and `NodeCommon.layoutPositioning` (only when `ABSOLUTE`) — preserves parent-relative resize behavior and absolute-positioned children inside auto-layout.
- Add `FrameLikeNode.cornerRadii` and `VectorNode.cornerRadii` (`{tl, tr, br, bl}`) when corners differ or `cornerRadius` is `figma.mixed`.
- **BREAKING** — `TextNode.style.letterSpacing` and `TypographyToken.letterSpacing`: `number` → `string | number`. Unit-aware values are now `"2%"` or `"0.5px"`; raw `number` is reserved for the unit-unknown fallback path. Consumers doing arithmetic on this field must parse the unit suffix.
- **BREAKING** — `InstanceNode.overrides`: `Record<string, string[]>` → `Record<string, { fields: string[]; nodeType?: string }>`. The current values for overridden fields remain recoverable via the matching child id within `children`; this change only restructures the metadata. The `nodeType` slot is reserved for a future post-walk enrichment pass.

### Slim transform (dump-engine)
- `sectionTree` lines now carry inline layout hints — `[hstack/vstack, wrap, justify=…, align=…, gap=…, gapY=…, p=…]` — so layout intent survives Slim mode (previously only Full carried these fields, and consumers using Slim lost all layout signal).

### Plugin UI (plugin-ui)
- Phase-based progress mapping with an asymptotic curve during traversing — the bar always advances and the phase label additionally shows the running processed-node count. Replaces the broken `state.total === 0` path that always rendered 0%.
- Primary button is disabled during a dump and re-enabled on completion (`done`), cancellation (`idle`), or error.
- Sandbox now emits `phase: idle` on every cancel exit path so the UI can never get stuck in a locked state when cancellation lands.

### Performance (dump-engine)
- Remove the per-override `figma.getNodeByIdAsync` call from `extract/instance.ts` (introduced in the initial overrides-restructure work). The N async lookups per instance were a latency multiplier on instance-rich pages; the same `nodeType` information is recoverable from the `children` subtree without an extra API round-trip.

### Tooling
- `node:test` + `esbuild`-bundled fixture test harness (`scripts/test.mjs`, `npm test`). Zero new runtime/dev dependencies. Initial coverage: 10 cases on the Slim transform's layout-hint generation and tree/text-summary invariants.
- `tsconfig.json` excludes `src/**/*.test.ts` from the main typecheck (test files use Node typings; sandbox code stays in the Figma typings world).
- `verify:all` now runs tests as part of the gate.

## Capabilities

### New Capabilities
<!-- None. All changes affect existing capabilities. -->

### Modified Capabilities
- `dump-engine`: extractor outputs change (new fields, restructured `overrides`), Slim transform now inlines layout hints, instance extraction drops per-override async lookup.
- `output-schema`: new fields on `FrameLikeNode`, `VectorNode`, `NodeCommon`; **BREAKING** type changes on `letterSpacing` and `InstanceNode.overrides`.
- `plugin-ui`: progress reporting, primary-button lifecycle, and cancel handshake change.

## Impact

- **Code touched** (already implemented, awaiting spec/tasks formalization): `src/code.ts`, `src/extract/{common,frame,instance,text,vector}.ts`, `src/schema.ts`, `src/slim/toSlim.ts`, `src/tokens/styles.ts`, `src/ui/main.ts`, `package.json`, `tsconfig.json`, `CHANGELOG.md`, plus new `scripts/test.mjs` and `src/slim/toSlim.test.ts`.
- **Schema version**: bump `SCHEMA_VERSION` from `"1.0"` to `"2.0"` and the `$schema` URL to `https://dcl-figma.dev/schemas/2.0.json`. The two BREAKING type changes (`letterSpacing`, `InstanceNode.overrides`) trigger a MAJOR bump per the project's stated semver policy. (See `tasks.md` 10.3 for the deliberation; codex consultation backed the 2.0 decision.)
- **Package version**: bump `package.json` from `0.1.0` to `0.2.0` and align `src/meta.ts` `VERSION` (currently hardcoded — see future single-source-of-truth task).
- **Downstream docs**: `docs/SCHEMA.md` must reflect the new fields and the two breaking type changes; `README.md` / `README.ko.md` examples need refresh; `CHANGELOG.md` already updated.
- **Dependencies**: zero new runtime or dev dependencies. Test harness uses Node's built-in `node:test` plus the existing `esbuild`.
- **Bundle size**: `dist/code.js` 34.4 KB → 38.5 KB; well under the 500 KB CI ceiling.
- **CI**: `npm test` enters the standard verify pipeline.
