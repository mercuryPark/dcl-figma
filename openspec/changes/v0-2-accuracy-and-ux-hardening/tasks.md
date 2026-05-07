## 1. UI hotfixes (already implemented)

- [x] 1.1 Replace the broken `state.total === 0` progress path with a phase-based percentage map and an asymptotic curve during traversing (`src/ui/main.ts`).
- [x] 1.2 Add the running processed-node count to the phase label during traversing (`src/ui/main.ts`).
- [x] 1.3 Disable the Dump button on click and re-enable it on `done` / `idle` / error / `enableResults()` (`src/ui/main.ts`).
- [x] 1.4 Reset `processed`, `phase`, progress bar, and phase label when a new dump starts (`src/ui/main.ts`).

## 2. Cancel handshake (already implemented)

- [x] 2.1 Add an `exitCancelled()` helper in `handleDump` that emits `phase: idle` (`src/code.ts`).
- [x] 2.2 Replace each bare `if (cancelled) return;` with `if (cancelled) { exitCancelled(); return; }` (`src/code.ts`).
- [x] 2.3 Treat `phase === "idle"` as a terminal state in the UI's unlock logic (`src/ui/main.ts`).

## 3. Accuracy P0 — schema (already implemented)

- [x] 3.1 Add `FrameLikeNode.layoutWrap` and `FrameLikeNode.counterAxisSpacing` to `schema.ts`.
- [x] 3.2 Add `NodeCommon.constraints` and `NodeCommon.layoutPositioning` to `schema.ts`.
- [x] 3.3 Add `CornerRadii` interface and `cornerRadii?: CornerRadii` on `FrameLikeNode` and `VectorNode` in `schema.ts`.
- [x] 3.4 Change `TextNode.style.letterSpacing` and `TypographyToken.letterSpacing` from `number` to `string | number` in `schema.ts` (BREAKING — document in CHANGELOG).
- [x] 3.5 Replace `InstanceNode.overrides: Record<string, unknown>` with the typed `Record<string, InstanceOverride>` in `schema.ts` (BREAKING — document in CHANGELOG).

## 4. Accuracy P0 — extractors (already implemented)

- [x] 4.1 Extract `counterAxisSpacing` and `layoutWrap` from auto-layout frames, with default-value pruning (`src/extract/frame.ts`).
- [x] 4.2 Extract `constraints` (skip when `{MIN, MIN}`) and `layoutPositioning` (skip when `"AUTO"`) in `commonFields` (`src/extract/common.ts`).
- [x] 4.3 Extract `cornerRadii` from frames when `cornerRadius === figma.mixed` or any per-corner radius is set; emit nothing if all four corners are 0 (`src/extract/frame.ts`).
- [x] 4.4 Mirror the cornerRadii logic for vector-family nodes (`src/extract/vector.ts`).
- [x] 4.5 Stringify `letterSpacing` as `"<n>%"` or `"<n>px"` with a raw `number` fallback for unit-unknown cases (`src/extract/text.ts`).
- [x] 4.6 Apply the same letterSpacing unit handling in the typography token collector (`src/tokens/styles.ts`).
- [x] 4.7 Restructure `overrides` to `{ fields, nodeType? }` and remove the per-override `figma.getNodeByIdAsync` lookup; document the children-subtree-recovery contract in code comments (`src/extract/instance.ts`).

## 5. Slim transform layout hints (already implemented)

- [x] 5.1 Add `justifyOf()` and `alignOf()` mappers that translate Figma's `MIN`/`CENTER`/`MAX`/`SPACE_BETWEEN`/`BASELINE` to short hint tokens (`src/slim/toSlim.ts`).
- [x] 5.2 Implement `layoutHint()` that emits the bracketed token list (`hstack/vstack`, `wrap`, `justify=…`, `align=…`, `gap=…`, `gapY=…`, `p=…`) and only when there is at least one token (`src/slim/toSlim.ts`).
- [x] 5.3 Wire `layoutHint()` into `renderSectionTree()` so each frame line carries the hint inline (`src/slim/toSlim.ts`).

## 6. Test harness (already implemented)

- [x] 6.1 Add `scripts/test.mjs` that discovers `src/**/*.test.ts`, bundles each via `esbuild` into `dist/test`, and runs them with `node --test`.
- [x] 6.2 Exclude `src/**/*.test.ts` from the main `tsconfig.json` typecheck.
- [x] 6.3 Wire `npm test` and add it to the `verify:all` pipeline (`package.json`).
- [x] 6.4 Author 10 fixture cases covering layout-hint generation, default-value pruning, padding shorthand, non-frame skip behavior, text-summary trimming, and section-tree depth limit (`src/slim/toSlim.test.ts`).

## 7. Verification

- [x] 7.1 `npm run typecheck` passes with 0 errors.
- [x] 7.2 `npm test` passes (10/10 cases).
- [x] 7.3 `npm run build` produces a bundle under the 500 KB ceiling (current: 38.5 KB).
- [x] 7.4 `npm run verify:manifest` and `npm run verify:locales` pass.

## 8. Documentation alignment (open)

- [ ] 8.1 Bump `package.json` version `0.1.0` → `0.2.0`.
- [ ] 8.2 Bump `src/meta.ts` `VERSION` to match (the hardcoded literal is the current source of truth — a single-source-of-truth refactor is tracked separately and is out of scope here).
- [ ] 8.3 Bump `SCHEMA_VERSION` constant from `"1.0"` to `"1.1"` in `src/schema.ts`.
- [ ] 8.4 Update `docs/SCHEMA.md` with the new fields (`counterAxisSpacing`, `layoutWrap`, `constraints`, `layoutPositioning`, `cornerRadii`) and document the two BREAKING type changes (letterSpacing, overrides).
- [ ] 8.5 Refresh the example outputs in `README.md` and `README.ko.md` to use `dcl-figma@0.2.0` and reflect the new field shapes.
- [ ] 8.6 Move the `## [Unreleased]` section in `CHANGELOG.md` under a `## [0.2.0]` heading with the release date when tagging.

## 9. Release (open)

- [ ] 9.1 Cut a `v0.2.0` git tag.
- [ ] 9.2 Build the release zip per `docs/publish-runbook.md`.
- [ ] 9.3 Attach the zip to the GitHub Release with the v0.2 changelog excerpt.
- [ ] 9.4 Verify the released zip imports cleanly into Figma Desktop on a sample file.

## 10. Follow-ups (out of scope, tracked here for visibility)

- [ ] 10.1 Post-walk enrichment pass that populates `overrides[id].nodeType` from the children subtree (deferred to v0.3 instance-walker overhaul).
- [ ] 10.2 Single-source-of-truth for version (`package.json` ⇄ `src/meta.ts` ⇄ `site/`).
- [ ] 10.3 Decide whether `SCHEMA_VERSION` should jump to `"2.0"` instead of `"1.1"` given the two scoped breaking type changes — resolve before tagging.
