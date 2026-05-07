// Style token collection — Paint / Text / Effect styles via Async APIs only.
// Grid styles are not surfaced in v1.0 (LLMs rarely need grid metadata).

import type { ColorToken, EffectToken, TypographyToken } from "../schema";
import { normalizeEffects, normalizePaints } from "../extract/common";
import { round2 } from "../util/prune";

export interface StyleCollectionResult {
  colors: ColorToken[];
  typography: TypographyToken[];
  effects: EffectToken[];
  error: string | null;
}

export async function collectStyles(): Promise<StyleCollectionResult> {
  const [paintsResult, textsResult, effectsResult] = await Promise.all([
    collectStyleList("paint", () => figma.getLocalPaintStylesAsync()),
    collectStyleList("text", () => figma.getLocalTextStylesAsync()),
    collectStyleList("effect", () => figma.getLocalEffectStylesAsync())
  ]);
  const paints = paintsResult.items;
  const texts = textsResult.items;
  const effects = effectsResult.items;

  const colors: ColorToken[] = [];
  for (const s of paints) {
    const value = normalizePaints((s as unknown as { paints?: unknown }).paints);
    if (value) colors.push({ id: s.id, name: s.name, value });
  }

  const typography: TypographyToken[] = [];
  for (const s of texts) {
    const any = s as unknown as {
      fontName?: { family?: string; style?: string };
      fontSize?: number;
      lineHeight?: { unit?: string; value?: number };
      letterSpacing?: { unit?: string; value?: number };
    };
    const tok: TypographyToken = { id: s.id, name: s.name };
    if (any.fontName?.family) tok.fontFamily = any.fontName.family;
    if (any.fontName?.style) tok.fontStyle = any.fontName.style;
    if (typeof any.fontSize === "number") tok.fontSize = round2(any.fontSize);
    if (any.lineHeight) {
      if (any.lineHeight.unit === "AUTO") tok.lineHeight = "AUTO";
      else if (typeof any.lineHeight.value === "number") {
        tok.lineHeight = `${round2(any.lineHeight.value)}${any.lineHeight.unit === "PERCENT" ? "%" : "px"}`;
      }
    }
    if (any.letterSpacing && typeof any.letterSpacing.value === "number") {
      if (any.letterSpacing.unit === "PERCENT") tok.letterSpacing = `${round2(any.letterSpacing.value)}%`;
      else if (any.letterSpacing.unit === "PIXELS") tok.letterSpacing = `${round2(any.letterSpacing.value)}px`;
      else tok.letterSpacing = round2(any.letterSpacing.value);
    }
    typography.push(tok);
  }

  const effectsOut: EffectToken[] = [];
  for (const s of effects) {
    const eff = normalizeEffects((s as unknown as { effects?: unknown }).effects);
    if (eff) effectsOut.push({ id: s.id, name: s.name, effects: eff });
  }

  const errors = [paintsResult.error, textsResult.error, effectsResult.error].filter((e): e is string => Boolean(e));
  return { colors, typography, effects: effectsOut, error: errors.length ? errors.join("; ") : null };
}

async function collectStyleList<T>(kind: string, load: () => Promise<ReadonlyArray<T>>): Promise<{ items: ReadonlyArray<T>; error: string | null }> {
  try {
    return { items: await load(), error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`[tokens/styles] ${kind} styles API failed:`, err);
    return { items: [], error: `${kind}: ${message}` };
  }
}
