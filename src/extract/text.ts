// Text node extraction — preserve characters verbatim, collect style subset.

import type { TextNode as TextOut } from "../schema";
import { commonFields, nodeBox, normalizePaints } from "./common";
import { round2 } from "../util/prune";

export function extractText(n: TextNode): TextOut {
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

  if (any.fontName && typeof any.fontName === "object" && "family" in any.fontName) {
    out.style.fontFamily = any.fontName.family;
    out.style.fontStyle = any.fontName.style;
  }
  if (typeof any.fontSize === "number") out.style.fontSize = round2(any.fontSize);

  const lh = any.lineHeight as { unit?: string; value?: number } | undefined;
  if (lh && typeof lh === "object" && "unit" in lh) {
    if (lh.unit === "AUTO") out.style.lineHeight = "AUTO";
    else if (typeof lh.value === "number") out.style.lineHeight = `${round2(lh.value)}${lh.unit === "PERCENT" ? "%" : "px"}`;
  }

  const ls = any.letterSpacing as { unit?: string; value?: number } | undefined;
  if (ls && typeof ls === "object" && typeof ls.value === "number") {
    out.style.letterSpacing = round2(ls.value);
  }

  if (typeof any.textCase === "string" && any.textCase !== "ORIGINAL") out.style.textCase = any.textCase;
  if (typeof any.textDecoration === "string" && any.textDecoration !== "NONE") out.style.textDecoration = any.textDecoration;

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;

  return out;
}
