// Text node extraction — preserve characters verbatim, collect style subset.

import type { TextNode as TextOut } from "../schema";
import { commonFields, nodeBox, normalizePaints } from "./common";
import { round2 } from "../util/prune";

type TextStyleRun = NonNullable<TextOut["style"]["runs"]>[number];

type StyledTextSegment = {
  start?: unknown;
  end?: unknown;
  fontName?: unknown;
  fontSize?: unknown;
  lineHeight?: unknown;
  letterSpacing?: unknown;
  fills?: unknown;
  textCase?: unknown;
  textDecoration?: unknown;
};

const SEGMENT_FIELDS = [
  "fontName",
  "fontSize",
  "lineHeight",
  "letterSpacing",
  "fills",
  "textCase",
  "textDecoration"
] as const;

function isPromiseLike<T>(value: unknown): value is PromiseLike<T> {
  return !!value && (typeof value === "object" || typeof value === "function") && typeof (value as { then?: unknown }).then === "function";
}

function isMixedValue(value: unknown): boolean {
  // Figma exposes figma.mixed as a symbol; avoid touching the global in tests.
  return typeof value === "symbol";
}

function normalizeFontName(value: unknown): Pick<TextStyleRun, "fontFamily" | "fontStyle"> {
  if (value && typeof value === "object" && "family" in value && "style" in value) {
    const font = value as { family?: unknown; style?: unknown };
    return {
      ...(typeof font.family === "string" ? { fontFamily: font.family } : {}),
      ...(typeof font.style === "string" ? { fontStyle: font.style } : {})
    };
  }
  return {};
}

function normalizeLineHeight(value: unknown): string | number | undefined {
  const lh = value as { unit?: string; value?: number } | undefined;
  if (!lh || typeof lh !== "object" || !("unit" in lh)) return undefined;
  if (lh.unit === "AUTO") return "AUTO";
  if (typeof lh.value === "number") return `${round2(lh.value)}${lh.unit === "PERCENT" ? "%" : "px"}`;
  return undefined;
}

function normalizeLetterSpacing(value: unknown): string | number | undefined {
  const ls = value as { unit?: string; value?: number } | undefined;
  if (!ls || typeof ls !== "object" || typeof ls.value !== "number") return undefined;
  if (ls.unit === "PERCENT") return `${round2(ls.value)}%`;
  if (ls.unit === "PIXELS") return `${round2(ls.value)}px`;
  return round2(ls.value);
}

function normalizeSegment(segment: StyledTextSegment): TextStyleRun | undefined {
  if (typeof segment.start !== "number" || typeof segment.end !== "number" || segment.end <= segment.start) return undefined;
  const run: TextStyleRun = {
    start: segment.start,
    end: segment.end,
    ...normalizeFontName(segment.fontName)
  };

  if (typeof segment.fontSize === "number") run.fontSize = round2(segment.fontSize);

  const lineHeight = normalizeLineHeight(segment.lineHeight);
  if (lineHeight !== undefined) run.lineHeight = lineHeight;

  const letterSpacing = normalizeLetterSpacing(segment.letterSpacing);
  if (letterSpacing !== undefined) run.letterSpacing = letterSpacing;

  const fills = normalizePaints(segment.fills);
  if (fills) run.fills = fills;

  if (typeof segment.textCase === "string" && segment.textCase !== "ORIGINAL") run.textCase = segment.textCase;
  if (typeof segment.textDecoration === "string" && segment.textDecoration !== "NONE") run.textDecoration = segment.textDecoration;

  return run;
}

function runStyleKey(run: TextStyleRun): string {
  const { start: _start, end: _end, ...style } = run;
  return JSON.stringify(style);
}

function mergeAdjacentRuns(runs: TextStyleRun[]): TextStyleRun[] {
  const merged: TextStyleRun[] = [];
  for (const run of runs) {
    const prev = merged[merged.length - 1];
    if (prev && prev.end === run.start && runStyleKey(prev) === runStyleKey(run)) {
      prev.end = run.end;
    } else {
      merged.push({ ...run });
    }
  }
  return merged;
}

async function extractStyleRuns(n: TextNode, hasMixedStyle: boolean): Promise<TextStyleRun[] | undefined> {
  if (!hasMixedStyle || n.characters.length === 0) return undefined;
  const source = n as unknown as {
    getStyledTextSegments?: (fields: readonly typeof SEGMENT_FIELDS[number][]) => unknown;
  };
  if (typeof source.getStyledTextSegments !== "function") return undefined;

  try {
    const result = source.getStyledTextSegments(SEGMENT_FIELDS);
    const segments = isPromiseLike<unknown>(result) ? await result : result;
    if (!Array.isArray(segments)) return undefined;
    const runs = segments.map((segment) => normalizeSegment(segment as StyledTextSegment)).filter((run): run is TextStyleRun => !!run);
    const merged = mergeAdjacentRuns(runs);
    return merged.length ? merged : undefined;
  } catch {
    return undefined;
  }
}

export async function extractText(n: TextNode): Promise<TextOut> {
  const out: TextOut = {
    id: n.id,
    type: "TEXT",
    name: n.name,
    characters: n.characters,
    style: {},
    ...commonFields(n)
  };
  const box = nodeBox(n);
  if (box) out.box = box;

  // Figma text fields are sometimes `figma.mixed` when a text run has multiple styles.
  const any = n as unknown as {
    fontName?: { family: string; style: string } | typeof figma.mixed;
    fontSize?: number | typeof figma.mixed;
    lineHeight?: unknown;
    letterSpacing?: unknown;
    textCase?: string | typeof figma.mixed;
    textDecoration?: string | typeof figma.mixed;
    fills?: unknown;
  };

  Object.assign(out.style, normalizeFontName(any.fontName));
  if (typeof any.fontSize === "number") out.style.fontSize = round2(any.fontSize);

  const lineHeight = normalizeLineHeight(any.lineHeight);
  if (lineHeight !== undefined) out.style.lineHeight = lineHeight;

  const letterSpacing = normalizeLetterSpacing(any.letterSpacing);
  if (letterSpacing !== undefined) out.style.letterSpacing = letterSpacing;

  if (typeof any.textCase === "string" && any.textCase !== "ORIGINAL") out.style.textCase = any.textCase;
  if (typeof any.textDecoration === "string" && any.textDecoration !== "NONE") out.style.textDecoration = any.textDecoration;

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;

  const hasMixedStyle = (
    isMixedValue(any.fontName) ||
    isMixedValue(any.fontSize) ||
    isMixedValue(any.lineHeight) ||
    isMixedValue(any.letterSpacing) ||
    isMixedValue(any.fills) ||
    isMixedValue(any.textCase) ||
    isMixedValue(any.textDecoration)
  );
  const runs = await extractStyleRuns(n, hasMixedStyle);
  if (runs) out.style.runs = runs;

  return out;
}
