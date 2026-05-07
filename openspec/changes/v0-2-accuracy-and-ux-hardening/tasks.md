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

## 8. Documentation alignment

- [x] 8.1 Bump `package.json` version `0.1.0` → `0.2.0`.
- [x] 8.2 Bump `src/meta.ts` `VERSION` to `0.2.0` (the hardcoded literal is the current source of truth — a single-source-of-truth refactor is tracked as 10.2).
- [x] 8.3 Bump `SCHEMA_VERSION` constant from `"1.0"` to `"2.0"` in `src/schema.ts` (resolution of 10.3 — see below). `$schema` URL also moves to `https://dcl-figma.dev/schemas/2.0.json`.
- [x] 8.4 Update `docs/SCHEMA.md` with the new fields (`counterAxisSpacing`, `layoutWrap`, `constraints`, `layoutPositioning`, `cornerRadii`), inline Slim layout-hint section, and a 2.0 migration section with code example for `letterSpacing` parsing and `overrides` shape change.
- [x] 8.5 Refresh the example outputs in `README.md` and `README.ko.md` to use `dcl-figma@0.2.0`, `schemaVersion: "2.0"`, and the new schemas URL. Both READMEs now carry a one-paragraph schema-2.0-vs-1.0 callout linking to the migration notes.
- [x] 8.6 Move the `## [Unreleased]` section in `CHANGELOG.md` under a `## [0.2.0] - 2026-05-07` heading. Added compare links for `[Unreleased]` and `[0.2.0]`.

## 9. Release

- [ ] 9.1 Cut a `v0.2.0` git tag.
- [ ] 9.2 Build the release zip per `docs/publish-runbook.md` (`(cd dist && zip -r ../dcl-figma-v0.2.0.zip .)`).
- [ ] 9.3 Push `main` and `v0.2.0` tag, then attach the zip to the GitHub Release with the v0.2 changelog excerpt.
- [ ] 9.4 Verify the released zip imports cleanly into Figma Desktop on a sample file (manual — left for the maintainer).

## 10. Follow-ups (out of scope of this change, tracked for visibility)

- [ ] 10.1 Post-walk enrichment pass that populates `overrides[id].nodeType` from the children subtree (deferred to v0.3 instance-walker overhaul).
- [ ] 10.2 Single-source-of-truth for version (`package.json` ⇄ `src/meta.ts` ⇄ `site/`).
- [x] 10.3 **Resolved** — `SCHEMA_VERSION` jumps to `"2.0"` instead of `"1.1"`. Rationale: existing project policy ("breaking → MAJOR"), the `InstanceNode.overrides` reshape is unambiguously breaking for any consumer iterating the old `string[]` shape, and the early adopter pool is small enough that this is the right time to use a clean major bump rather than smuggle breaking changes into a minor bump (codex consult, 2026-05-07).
