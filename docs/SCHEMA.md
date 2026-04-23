# Output schema — Slim & Full

This document is the canonical narrative description of the JSON emitted by **Design Context for LLMs**. For the TypeScript source of truth, see [`src/schema.ts`](../src/schema.ts).

## Versioning

- `schemaVersion` follows **semver** (`"MAJOR.MINOR"`).
- Breaking changes (field removed, field renamed, type changed) bump MAJOR.
- Additive changes (new optional field) bump MINOR.
- The current version is **1.0**.

## Top-level envelope (both Slim and Full)

Every dump begins with four "self-documenting" fields so a single file tells its own story to an LLM:

| Field | Type | Notes |
|---|---|---|
| `$schema` | `string` | URL to the published schema for this version. |
| `schemaVersion` | `string` | Semver string, currently `"1.0"`. |
| `_howToUse` | `string` | One-line English prompt the LLM can read verbatim. |
| `meta` | `object` | See **Meta**. |

## Meta

| Field | Type | Notes |
|---|---|---|
| `fileKey` | `string \| null` | Figma file key when available. Plugin API does not expose this directly in all contexts; `null` when unknown. |
| `fileName` | `string` | Verbatim Figma file name. |
| `pageId` | `string` | Page id for single-page dumps. For `all`-page dumps this is the currently focused page id. |
| `pageName` | `string` | Verbatim page name. For `all` dumps this is `"(all pages)"`. |
| `tool` | `string` | `dcl-figma@X.Y.Z`. |
| `generatedAt` | `string` | UTC ISO 8601 timestamp. |
| `degraded` | `string[]` | Slim only; always `[]` for Full. See **Slim degradation ladder**. |
| `stats` | `object` | `{ totalNodes, svgExported, svgFailed, variablesError }`. |

## Full envelope

| Field | Type | Notes |
|---|---|---|
| `tokens` | `object` | See **Tokens**. |
| `pages` | `Page[]` | Deep node trees, z-order preserved. |
| `components` | `ComponentEntry[]` | Top-level Component / ComponentSet metadata. |

### Node tree

Every node carries `id`, `type`, `name`. Optional fields are omitted when they match their Figma default (see pruning rules below).

| Field family | Applies to | Notes |
|---|---|---|
| `box` | all | `{ x, y, w, h }`, numbers rounded to 2 decimals. |
| `visible / opacity / rotation / blendMode / locked` | all | Only emitted when not at Figma's default. |
| `layoutMode / itemSpacing / padding*` | FRAME / GROUP / SECTION / COMPONENT / COMPONENT_SET | Auto Layout fields. |
| `fills / strokes / effects / cornerRadius` | FRAME-like, VECTOR, TEXT (fills only) | Normalized paint/effect shapes. |
| `characters / style` | TEXT | Preserved verbatim — never truncated. |
| `mainComponentId / overrides` | INSTANCE | Instance carries an id pointer; the Component's subtree is not recursively nested. |
| `children` | FRAME-like, INSTANCE | Figma z-order preserved — no client-side sort. |
| `origType / svg / svgExportFailed` | VECTOR | `origType` is the original Figma type; `svg` appears only when SVG export was opted in and succeeded. |

### Vector family

`LINE`, `RECTANGLE`, `ELLIPSE`, `POLYGON`, `STAR`, `BOOLEAN_OPERATION`, `VECTOR` all collapse to `type: "VECTOR"` with `origType` preserving the source.

## Slim envelope

The Slim envelope strips node trees and keeps per-screen summaries so the JSON fits in an LLM context window.

| Field | Type | Notes |
|---|---|---|
| `tokens` | `Tokens?` | Dropped at degradation stage 3. |
| `screens` | `ScreenSummary[]` | One entry per top-level FRAME / SECTION / COMPONENT of each page. |
| `components` | `ComponentEntry[]` | Same as Full. |

### ScreenSummary

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | Root node id for the screen. |
| `name` | `string` | Root node name. |
| `box` | `Box?` | Screen bounding box when known. |
| `textSummary` | `string[]` | Up to N text `characters` extracted in DFS order. N starts at 20 and degrades. |
| `sectionTree` | `string` | Indent-based text tree of the screen's subtree, capped at depth D (3 → 2 when degraded). |

### Slim degradation ladder

When `JSON.stringify(slim).length > 500KB`, the pipeline re-runs `toSlim` with tighter knobs in this order and records each stage in `meta.degraded`:

| Stage | Marker | Effect |
|---|---|---|
| 1 | `textSummary:20->10` | `textSummary` trimmed from 20 to 10 entries per screen. |
| 2 | `sectionTree:3->2` | `sectionTree` depth reduced from 3 to 2. |
| 3 | `tokens:dropped` | `tokens` omitted from Slim (Full still carries it). |

If none of these brings the byte size ≤ 500KB, the Slim is still emitted with `"exceededAfterFullDegrade"` appended as the final marker so tools can detect the degenerate case.

## Tokens

| Subfield | Type | Notes |
|---|---|---|
| `colors` | `ColorToken[]` | PaintStyle: `{ id, name, value: Paint[] }`. |
| `typography` | `TypographyToken[]` | TextStyle: `{ id, name, fontFamily?, fontStyle?, fontSize?, lineHeight?, letterSpacing? }`. |
| `effects` | `EffectToken[]` | EffectStyle: `{ id, name, effects: Effect[] }`. |
| `variables` | `VariableEntry[]` | See **Variables**. |

### Variables

One entry per **(Variable × Mode)** pair. Both `modeId` and `modeName` are preserved so LLMs get semantic labels while tools keep a stable identifier.

```json
{
  "id": "VariableID:123",
  "name": "color/primary",
  "collectionName": "Brand",
  "resolvedType": "COLOR",
  "value": "#ff3366",
  "modeId": "1:0",
  "modeName": "light"
}
```

If the Variables API throws or is unavailable, the array is `[]` and `meta.stats.variablesError` is `true`.

## Pruning rules

- Numbers are rounded via `Math.round(n * 100) / 100`.
- Fields equal to Figma defaults are omitted: `visible=true`, `opacity=1`, `rotation=0`, `blendMode="NORMAL" | "PASS_THROUGH"`, `locked=false`.
- `null`, `undefined`, `[]`, `{}` values are stripped.

## Deterministic children order

The extractor **never** sorts `children` arrays. The emitted order mirrors Figma's render order (bottom → top), which is also stable across dumps of an unchanged file.

## File naming

```
figma.{fileSlug}.{pageSlug}.slim.json
figma.{fileSlug}.{pageSlug}.full.json
```

- `fileSlug` / `pageSlug`: lowercase kebab-case ASCII, Hangul romanized, other non-ASCII characters collapsed to `-`.
- Empty slug → `x-<base32>` fallback (rare; only when the source string contains no romanizable characters).
- All-pages dump uses `pageSlug = "all"`.

## Version diff log

### 1.0 (initial)

- Initial public schema shipped with Figma Community v1.0.0 release.
- `meta.degraded` introduced as a first-class audit trail.
- `variables[]` stores `{ modeId, modeName }` pairs explicitly.
