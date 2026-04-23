// Vector-family nodes (LINE / RECTANGLE / ELLIPSE / POLYGON / STAR / BOOLEAN_OPERATION / VECTOR).

import type { VectorNode as VectorOut } from "../schema";
import { commonFields, nodeBox, normalizePaints } from "./common";
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
    cornerRadius?: number | typeof figma.mixed;
  };

  const fills = normalizePaints(any.fills);
  if (fills) out.fills = fills;
  const strokes = normalizePaints(any.strokes);
  if (strokes) out.strokes = strokes;
  if (typeof any.strokeWeight === "number" && any.strokeWeight !== 0) out.strokeWeight = round2(any.strokeWeight);
  if (typeof any.cornerRadius === "number" && any.cornerRadius !== 0) out.cornerRadius = round2(any.cornerRadius);

  return out;
}
