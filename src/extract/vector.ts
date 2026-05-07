// Vector-family nodes (LINE / RECTANGLE / ELLIPSE / POLYGON / STAR / BOOLEAN_OPERATION / VECTOR).

import type { VectorNode as VectorOut } from "../schema";
import { commonFields, computeRenderBox, extractStrokeFields, nodeBox, normalizeEffects, normalizePaints } from "./common";
import { round2 } from "../util/prune";

export type VectorFamilyType = VectorOut["origType"];

export function isVectorFamily(type: string): type is VectorFamilyType {
  return (
    type === "LINE" || type === "RECTANGLE" || type === "ELLIPSE" || type === "POLYGON" ||
    type === "STAR" || type === "BOOLEAN_OPERATION" || type === "VECTOR"
  );
}

export function extractVector(n: SceneNode & { type: VectorFamilyType }): VectorOut {
  const out: VectorOut = {
    id: n.id,
    type: "VECTOR",
    origType: n.type,
    name: n.name,
    ...commonFields(n)
  };
  const box = nodeBox(n);
  if (box) out.box = box;

  const any = n as unknown as {
    fills?: unknown;
    strokes?: unknown;
    strokeWeight?: number | typeof figma.mixed;
    strokeAlign?: unknown;
    strokeCap?: unknown;
    strokeJoin?: unknown;
    strokeDashes?: unknown;
    dashPattern?: unknown;
    strokeMiterLimit?: unknown;
    cornerRadius?: number | typeof figma.mixed;
    topLeftRadius?: number;
    topRightRadius?: number;
    bottomRightRadius?: number;
    bottomLeftRadius?: number;
    effects?: unknown;
  };

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;
  const strokes = normalizePaints(any.strokes);
  if (strokes) out.strokes = strokes;
  const renderBox = computeRenderBox(box, normalizeEffects(any.effects));
  if (renderBox) out.renderBox = renderBox;
  if (typeof any.strokeWeight === "number" && any.strokeWeight !== 0) out.strokeWeight = round2(any.strokeWeight);
  Object.assign(out, extractStrokeFields(any));
  if (typeof any.cornerRadius === "number" && any.cornerRadius !== 0) {
    out.cornerRadius = round2(any.cornerRadius);
  } else if (typeof any.cornerRadius === "symbol" || typeof any.topLeftRadius === "number") {
    const tl = round2(any.topLeftRadius ?? 0);
    const tr = round2(any.topRightRadius ?? 0);
    const br = round2(any.bottomRightRadius ?? 0);
    const bl = round2(any.bottomLeftRadius ?? 0);
    if (tl !== 0 || tr !== 0 || br !== 0 || bl !== 0) {
      out.cornerRadii = { tl, tr, br, bl };
    }
  }

  return out;
}
