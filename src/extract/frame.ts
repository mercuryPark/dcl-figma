// Frame / Group / Section / Component / ComponentSet extraction.

import type { FrameLikeNode } from "../schema";
import { commonFields, nodeBox, normalizeEffects, normalizePaints } from "./common";
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
    primaryAxisAlignItems?: string;
    counterAxisAlignItems?: string;
    primaryAxisSizingMode?: string;
    counterAxisSizingMode?: string;
    itemSpacing?: number;
    paddingLeft?: number;
    paddingRight?: number;
    paddingTop?: number;
    paddingBottom?: number;
    fills?: unknown;
    strokes?: unknown;
    effects?: unknown;
    cornerRadius?: number | typeof figma.mixed;
    clipsContent?: boolean;
  };

  if (any.layoutMode && any.layoutMode !== "NONE") obj.layoutMode = any.layoutMode;
  if (any.primaryAxisAlignItems) obj.primaryAxisAlignItems = any.primaryAxisAlignItems;
  if (any.counterAxisAlignItems) obj.counterAxisAlignItems = any.counterAxisAlignItems;
  if (any.primaryAxisSizingMode) obj.primaryAxisSizingMode = any.primaryAxisSizingMode;
  if (any.counterAxisSizingMode) obj.counterAxisSizingMode = any.counterAxisSizingMode;
  if (typeof any.itemSpacing === "number" && any.itemSpacing !== 0) obj.itemSpacing = round2(any.itemSpacing);
  if (typeof any.paddingLeft === "number" && any.paddingLeft !== 0) obj.paddingLeft = round2(any.paddingLeft);
  if (typeof any.paddingRight === "number" && any.paddingRight !== 0) obj.paddingRight = round2(any.paddingRight);
  if (typeof any.paddingTop === "number" && any.paddingTop !== 0) obj.paddingTop = round2(any.paddingTop);
  if (typeof any.paddingBottom === "number" && any.paddingBottom !== 0) obj.paddingBottom = round2(any.paddingBottom);

  const fills = normalizePaints(any.fills);
  if (fills) obj.fills = fills;
  const strokes = normalizePaints(any.strokes);
  if (strokes) obj.strokes = strokes;
  const effects = normalizeEffects(any.effects);
  if (effects) obj.effects = effects;

  if (typeof any.cornerRadius === "number" && any.cornerRadius !== 0) obj.cornerRadius = round2(any.cornerRadius);
  if (any.clipsContent === true) obj.clipsContent = true;

  return obj;
}
