## Context

`figma-design-dumper` v0.1.0 shipped a usable but rough first cut. Two reviews (an internal structural audit and a deeper `codex` second-opinion pass) converged on three classes of issues:

1. **Visible UI bugs** — the progress bar never advances (the sandbox does not pre-compute total node count, and the UI's `state.total === 0` short-circuit always returns 0%); the Dump button has no in-flight lock so a double-click corrupts chunk reassembly; the cancel path silently `return`s without emitting a terminal phase, leaving the primary button locked.
2. **Accuracy gaps in the dump schema** — counter-axis spacing on wrap layouts, per-node `constraints` and `layoutPositioning`, individual corner radii, and `letterSpacing.unit` are all dropped, so LLMs consuming the dump can't reproduce the design pixel-faithfully. `Slim` mode loses *all* layout information from child frames (only the top screen carries `box`).
3. **Performance hot-spot** — the initial overrides-restructure work added a per-override `figma.getNodeByIdAsync` lookup in `extract/instance.ts`. On instance-rich pages this is a latency multiplier with no functional benefit (the same `nodeType` info is already in the `children` subtree the walker just produced).

We're also lacking an automated test harness; every regression today is caught by manually dumping a real file and reading the JSON.

This change ships those fixes together as the v0.2 baseline so downstream consumers see one schema bump rather than two.

## Goals / Non-Goals

**Goals:**
- Restore visible progress feedback and prevent the Dump button from getting stuck (locked or always 0%).
- Preserve enough Figma layout/text fidelity in both `Full` and `Slim` outputs that an LLM can reconstruct common UI patterns (auto-layout with wrap, per-corner radii, percent-based letter-spacing, parent-relative constraints, absolute-positioned children).
- Restructure `InstanceNode.overrides` to a typed object shape and remove the per-override `getNodeByIdAsync` cost.
- Establish a zero-extra-dependency test harness using Node's built-in `node:test` and the existing `esbuild`, plus initial coverage on the Slim transform's layout-hint generation.
- Bundle the resulting BREAKING type changes (`letterSpacing`, `overrides`) into a single schema bump (`1.0` → `1.1`).

**Non-Goals:**
- We are NOT addressing the full `codex` audit list (e.g., `strokeAlign`, `gradientTransform`, mixed-text textRange, scrim layer detection, COMPONENT_SET variant selection, post-walk override enrichment, single-source version management). Those are explicitly deferred.
- We are NOT changing the chunked transport, the SVG export pipeline, the Variables collection contract, or the slim degradation ladder.
- We are NOT promoting the plugin to the Figma Community in this change. Distribution remains GitHub Release zip.
- We are NOT implementing a cancel button in the UI; the cancel-unlock work hardens the existing `cancel` message path so a future button has a safe handshake to plug into.

## Decisions

### 1. Phase-based progress with an asymptotic curve, not a true total
**Decision**: Map `phase` to a percentage; during `traversing`, advance the bar via `25 + (60 - 25) * processed / (processed + 500)`. Show the running `processed` count in the phase label.
**Why**: Pre-computing total node count would require a full extra pass (`O(N)`) before extraction. The asymptotic curve gives "the bar always moves, never overshoots" without measuring the tree. The per-node count in the label gives raw activity feedback for very large trees.
**Alternative considered**: emit `total` from the sandbox after a quick pre-pass — rejected because it doubles traversal cost on the worst case (which is exactly when this matters).

### 2. `phase: idle` is the single terminal signal for unlock
**Decision**: The UI unlocks the Dump button on `phase === "done"` *or* `phase === "idle"`. The sandbox emits `phase: idle` on every cancel exit path via a small `exitCancelled()` helper.
**Why**: We already had `idle` as the post-error reset state. Reusing it for cancel keeps the UI state machine to two terminal states (success, idle) instead of three (success, idle, cancelled). A future explicit `cancelled` message can layer on top without changing the unlock contract.
**Alternative considered**: introduce a new `cancelled` message — rejected for v0.2 because there's no UI affordance to consume it yet (no cancel button).

### 3. `letterSpacing` becomes `string | number`
**Decision**: When the unit is known, emit `"2%"` or `"0.5px"`. Reserve raw `number` for the unit-unknown fallback.
**Why**: Without the unit, percent values are silently misread as pixels — catastrophic on CJK text. Stringifying with the unit suffix mirrors the existing `lineHeight` shape so both fields follow one convention.
**Alternative considered**: keep `letterSpacing: number` and add a parallel `letterSpacingUnit: string` — rejected because it doubles the field count and consumers would need to know to read both.

### 4. `InstanceNode.overrides` becomes `Record<string, { fields: string[]; nodeType?: string }>`
**Decision**: Replace `Record<string, string[]>` with the typed object. Document that the *current values* of overridden fields are recoverable via the matching child id within `children`. Reserve `nodeType` for a future post-walk enrichment pass (not populated in v0.2).
**Why**: The original shape has no room to grow (need to know the override's node type for cheap LLM lookups, plus future fields). The current-values question is best solved by walking `children` once after extraction, not by N async lookups during extraction.
**Performance corollary**: `extract/instance.ts` no longer calls `figma.getNodeByIdAsync` per override (it was set during this same change cycle and is being removed before any release contains it).
**Alternative considered**: keep the old shape and tag the override values inline — rejected because override values can be objects (paints, effects) and inlining them grows the dump dramatically.

### 5. Slim layout hints are inlined into `sectionTree` lines, not a new structured field
**Decision**: Append `[hstack/vstack, wrap, justify=…, align=…, gap=…, gapY=…, p=…]` to each frame line in `sectionTree`.
**Why**: `sectionTree` is already a string the LLM reads top-to-bottom. Adding a structured `layoutHints` field would require teaching consumers a new schema slot; appending to the line keeps the existing contract and gives the same signal in fewer tokens.
**Padding shorthand**: 1 value when symmetric, 2 values when `t==b && l==r`, 4 values otherwise — mirrors CSS shorthand readers already know.
**`MIN`-default pruning**: only emit `justify=` / `align=` when the value is non-default (Figma's MIN), so the hint stays compact for the common case.

### 6. `node:test` + `esbuild` instead of vitest/jest
**Decision**: Add `scripts/test.mjs` that bundles every `src/**/*.test.ts` via the existing `esbuild` and runs them with `node --test`. No new dev dependency.
**Why**: The repo already ships zero-runtime-dependency. The test layer should not break that pattern. `node:test` is built into Node 18+, and we already have `esbuild` for the build pipeline. The fixture-only style (no DOM, no Figma API mocking) means we only need to test pure functions like `toSlim` — vitest/jest features are overkill.
**Cost**: tests run ~70ms for the current 10 cases; bundle step is part of `npm test`.

### 7. Test files are excluded from the main typecheck
**Decision**: Add `"src/**/*.test.ts"` to `tsconfig.json` `exclude`. Tests reference Node typings (`node:test`, `node:assert/strict`) that conflict with the main `@figma/plugin-typings`-only types config. Tests are still type-checked at bundle time by `esbuild` (which catches structural errors), and `node --test` catches runtime failures.
**Alternative considered**: add `"node"` to `tsconfig.json` `types` — rejected because it leaks Node globals (`process`, `Buffer`, `__dirname`, etc.) into sandbox code, where they don't exist at runtime and would silently typecheck.

## Risks / Trade-offs

- **[Risk]** External consumers that did `parseFloat(node.style.letterSpacing)` will silently get the leading number (e.g., `2` from `"2%"`) and treat it as pixels. → **Mitigation**: explicit BREAKING entry in `CHANGELOG.md`; schema bump to `1.1`; documented in spec.
- **[Risk]** External consumers that iterated `instance.overrides[id]` as a `string[]` will now get an object and crash. → **Mitigation**: same BREAKING entry; the field name (`fields`) inside the new shape is identical to the conceptual content of the old array, so the migration is `obj.fields` → array.
- **[Risk]** Layout hints inflate `sectionTree` enough to push more files past the 500KB Slim ceiling, triggering the degradation ladder more often. → **Mitigation**: hints are short (≤30 chars per frame typically); the existing 3-stage ladder absorbs the overage without code changes; we monitor real dumps for degradation regressions.
- **[Risk]** The asymptotic progress curve never reaches 60% during traversing on small files (it asymptotes to 60% only at infinite `processed`). → **Acceptable**: phase transitions to `collectingStyles` (65%) push it forward; the bar always *advances*, which is the original requirement.
- **[Trade-off]** Removing `getNodeByIdAsync` means `overrides[id].nodeType` is always undefined in v0.2. Consumers who need the node type must walk `children` themselves. → **Acceptable**: the type is one cheap lookup away; we keep the slot reserved for a future post-walk enrichment.
- **[Trade-off]** `tsconfig` exclude for test files means tests don't share strict null/index checks with sandbox code. → **Acceptable**: `esbuild` still catches type errors at bundle time; the alternative (Node types in sandbox tsconfig) is worse.

## Migration Plan

This release is consumer-facing on the schema only (the plugin itself is the only sandbox runtime).

1. Land the source changes (already implemented locally — 13 files modified, 2 new files).
2. Bump `package.json` version `0.1.0` → `0.2.0` and `src/meta.ts` `VERSION` to match (see open question on single-source).
3. Update `docs/SCHEMA.md` to document new fields and the two BREAKING type changes.
4. Update `README.md` / `README.ko.md` example outputs (currently show `dcl-figma@1.0.0`, should show `0.2.0`).
5. Update `SCHEMA_VERSION` constant from `"1.0"` to `"1.1"`.
6. Tag `v0.2.0`, build the release zip per `docs/publish-runbook.md`, attach to the GitHub Release.
7. Rollback strategy: if a regression is found post-tag, revert by re-publishing v0.1.0's zip (the plugin is loaded by users from the Release page, so this is a documentation-level rollback rather than a server-side one).

## Open Questions

1. Should `SCHEMA_VERSION` jump to `"2.0"` instead of `"1.1"` to flag the two BREAKING type changes? This change picks `"1.1"` because the new fields are additive and the breaking changes are scoped to two specific type slots, but a strict semver reading of "any breaking" → major would justify `"2.0"`. Resolve before tagging.
2. Should a future enrichment pass populate `overrides[id].nodeType` automatically (post-walk), or leave it to consumers? If the former, do it as part of the v0.3 instance-walker overhaul tracked separately.
3. Single-source-of-truth for version (`package.json` ⇄ `src/meta.ts` ⇄ `site/`) is out of scope but a related task should land before v0.2 ships.
