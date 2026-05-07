// Frame / Group / Section / Component / ComponentSet extraction.

import type { FrameLikeNode } from "../schema";
import { commonFields, extractIndividualStrokes, extractStrokeFields, nodeBox, normalizeEffects, normalizePaints } from "./common";
import { prune, round2 } from "../util/prune";

export function extractFrameLike(n: SceneNode): Omit<FrameLikeNode, "children"> {
  const obj: FrameLikeNode = prune({
    id: n.id,
    type: n.type as FrameLikeNode["type"],
    name: n.name,
    box: nodeBox(n as { x?: number; y?: number; width?: number; height?: number }),
    ...commonFields(n)
  }) as FrameLikeNode;

  const any = n as unknown as {
    layoutMode?: string;
    layoutWrap?: string;
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    itemSpacing?: number;
    counterAxisSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    fills?: unknown;
    strokes?: unknown;
    strokeAlign?: unknown;
    strokeCap?: unknown;
    strokeJoin?: unknown;
    strokeDashes?: unknown;
    dashPattern?: unknown;
    strokeMiterLimit?: unknown;
    strokeTopWeight?: unknown;
    strokeRightWeight?: unknown;
    strokeBottomWeight?: unknown;
    strokeLeftWeight?: unknown;
    effects?: unknown;
    cornerRadius?: number | typeof figma.mixed;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomRightRadius?: number;
    bottomLeftRadius?: number;
    clipsContent?: boolean;
  };

  if (any.layoutMode && any.layoutMode !== "NONE") obj.layoutMode = any.layoutMode;
  if (typeof any.layoutWrap === "string" && any.layoutWrap !== "NO_WRAP") obj.layoutWrap = any.layoutWrap;
  if (any.primaryAxisAlignItems) obj.primaryAxisAlignItems = any.primaryAxisAlignItems;
  if (any.counterAxisAlignItems) obj.counterAxisAlignItems = any.counterAxisAlignItems;
  if (any.primaryAxisSizingMode) obj.primaryAxisSizingMode = any.primaryAxisSizingMode;
  if (any.counterAxisSizingMode) obj.counterAxisSizingMode = any.counterAxisSizingMode;
  if (typeof any.itemSpacing === "number" && any.itemSpacing !== 0) obj.itemSpacing = round2(any.itemSpacing);
  if (typeof any.counterAxisSpacing === "number" && any.counterAxisSpacing !== 0) obj.counterAxisSpacing = round2(any.counterAxisSpacing);
  if (typeof any.paddingLeft === "number" && any.paddingLeft !== 0) obj.paddingLeft = round2(any.paddingLeft);
  if (typeof any.paddingRight === "number" && any.paddingRight !== 0) obj.paddingRight = round2(any.paddingRight);
  if (typeof any.paddingTop === "number" && any.paddingTop !== 0) obj.paddingTop = round2(any.paddingTop);
  if (typeof any.paddingBottom === "number" && any.paddingBottom !== 0) obj.paddingBottom = round2(any.paddingBottom);

  const fills = normalizePaints(any.fills);
  if (fills) obj.fills = fills;
  const strokes = normalizePaints(any.strokes);
  if (strokes) obj.strokes = strokes;
  Object.assign(obj, extractStrokeFields(any));
  const individualStrokes = extractIndividualStrokes(any);
  if (individualStrokes) obj.individualStrokes = individualStrokes;
  const effects = normalizeEffects(any.effects);
  if (effects) obj.effects = effects;

  // Corner radius: figma.mixed (symbol) means corners differ — fall back to per-corner fields.
  if (typeof any.cornerRadius === "number" && any.cornerRadius !== 0) {
    obj.cornerRadius = round2(any.cornerRadius);
  } else if (typeof any.cornerRadius === "symbol" || typeof any.topLeftRadius === "number") {
    const tl = round2(any.topLeftRadius ?? 0);
    const tr = round2(any.topRightRadius ?? 0);
    const br = round2(any.bottomRightRadius ?? 0);
    const bl = round2(any.bottomLeftRadius ?? 0);
    if (tl !== 0 || tr !== 0 || br !== 0 || bl !== 0) {
      obj.cornerRadii = { tl, tr, br, bl };
    }
  }
  if (any.clipsContent === true) obj.clipsContent = true;

  return obj;
}
